import prisma from '../../shared/database/prisma';
import { NotFoundError, ConflictError, AppError } from '../../shared/errors/AppError';
import { createNotification } from '../../shared/utils/notification.utils';
import type { CreateScheduleDto, UpdateScheduleDto, ScheduleQueryDto } from './schedule.dto';
import { format } from 'date-fns';

export class ScheduleService {
  /**
   * Get all schedule assignments, optionally filtered by month.
   * Returns grouped by date for calendar rendering.
   */
  async findAll(query: ScheduleQueryDto) {
    const where: any = {};

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      // date is stored as VARCHAR(10) 'yyyy-MM-dd'
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      where.date = { gte: start, lte: end };
    } else if (query.startDate && query.endDate) {
      where.date = { gte: query.startDate, lte: query.endDate };
    }

    const assignments = await prisma.scheduleAssignment.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        shift: true,
        attendance: { select: { id: true, status: true, checkInAt: true } },
      },
      orderBy: [{ date: 'asc' }, { shift: { startTime: 'asc' } }],
    });

    return assignments;
  }

  /**
   * Get schedule for a specific employee
   */
  async findByEmployee(employeeId: string, query: ScheduleQueryDto) {
    const where: any = { employeeId };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-31`;
      where.date = { gte: start, lte: end };
    }

    return prisma.scheduleAssignment.findMany({
      where,
      include: {
        shift: true,
        attendance: { select: { id: true, status: true, checkInAt: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findById(id: string) {
    const assignment = await prisma.scheduleAssignment.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        shift: true,
        attendance: true,
      },
    });

    if (!assignment) throw new NotFoundError('Penugasan jadwal');
    return assignment;
  }

  /**
   * Create schedule assignments for one or more employees on a date+shift
   */
  async create(dto: CreateScheduleDto, createdBy: string) {
    // Validate shift exists
    const shift = await prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift || !shift.isActive) throw new NotFoundError('Shift');

    // Check capacity: how many employees already assigned on this date+shift
    const existing = await prisma.scheduleAssignment.count({
      where: { date: dto.date, shiftId: dto.shiftId },
    });

    if (existing + dto.employeeIds.length > shift.maxEmployees) {
      throw new AppError(`Shift ini hanya dapat menampung maksimal ${shift.maxEmployees} karyawan`, 400);
    }

    // Validate each employee
    for (const empId of dto.employeeIds) {
      const employee = await prisma.employee.findUnique({ where: { id: empId } });
      if (!employee || employee.employmentStatus !== 'ACTIVE') {
        throw new AppError('Karyawan tidak ditemukan atau tidak aktif', 400);
      }

      // Check if employee already has assignment on this date
      const conflict = await prisma.scheduleAssignment.findFirst({
        where: { date: dto.date, employeeId: empId },
      });
      if (conflict) {
        throw new ConflictError(`Karyawan ${employee.fullName} sudah memiliki jadwal pada tanggal tersebut`);
      }
    }

    // Create assignments
    const assignments = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const empId of dto.employeeIds) {
        const a = await tx.scheduleAssignment.create({
          data: {
            date: dto.date,
            employeeId: empId,
            shiftId: dto.shiftId,
            createdBy,
          },
          include: {
            employee: {
              select: { id: true, fullName: true, user: { select: { id: true } } },
            },
            shift: true,
          },
        });
        created.push(a);
      }

      await tx.auditLog.create({
        data: {
          actorId: createdBy,
          action: 'CREATE_SCHEDULE',
          entityType: 'schedule_assignments',
          entityId: created[0]?.id,
          afterData: { date: dto.date, shiftId: dto.shiftId, employeeIds: dto.employeeIds },
        },
      });

      return created;
    });

    // Notify employees
    for (const assignment of assignments) {
      await createNotification({
        userId: assignment.employee.user.id,
        title: 'Jadwal Baru',
        message: `Anda dijadwalkan bekerja pada ${dto.date} shift ${shift.name}`,
        notificationType: 'SCHEDULE',
        referenceType: 'schedule_assignments',
        referenceId: assignment.id,
      });
    }

    return assignments;
  }

  /**
   * Delete a schedule assignment (only if no attendance)
   */
  async delete(id: string, deletedBy: string) {
    const assignment = await this.findById(id);

    if (assignment.attendance) {
      throw new AppError('Tidak dapat menghapus jadwal yang sudah memiliki absensi', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.scheduleAssignment.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: deletedBy,
          action: 'DELETE_SCHEDULE',
          entityType: 'schedule_assignments',
          entityId: id,
          beforeData: { date: assignment.date, shiftId: assignment.shiftId, employeeId: assignment.employeeId },
        },
      });
    });

    return { message: 'Jadwal berhasil dihapus' };
  }

  async getShifts() {
    return prisma.shift.findMany({ where: { isActive: true }, orderBy: { startTime: 'asc' } });
  }

  /**
   * Get today's schedule status (present/absent)
   */
  async getTodayStatus() {
    const today = format(new Date(), 'yyyy-MM-dd');

    const assignments = await prisma.scheduleAssignment.findMany({
      where: { date: today },
      include: {
        employee: { select: { id: true, fullName: true } },
        shift: true,
        attendance: { select: { id: true, status: true, checkInAt: true } },
      },
    });

    const present: any[] = [];
    const absent: any[] = [];

    for (const a of assignments) {
      if (a.attendance) {
        present.push({ employee: a.employee, status: a.attendance.status, shift: a.shift.name, checkInAt: a.attendance.checkInAt });
      } else {
        absent.push({ employee: a.employee, shift: a.shift.name });
      }
    }

    return { present, absent, presentCount: present.length, absentCount: absent.length };
  }
}

export const scheduleService = new ScheduleService();
