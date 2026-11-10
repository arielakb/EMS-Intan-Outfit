import prisma from '../../shared/database/prisma';
import { NotFoundError, AppError, ConflictError } from '../../shared/errors/AppError';
import { AttendanceStatus } from '@prisma/client';
import { isWithinCheckinWindow } from '../../shared/utils/date.utils';
import { employeeService } from '../employees/employee.service';
import { createNotificationForAllOwners } from '../../shared/utils/notification.utils';
import { format } from 'date-fns';

export class AttendanceService {
  async checkIn(employeeId: string, selfieFileId: string | undefined, createdBy: string) {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    // Find today's schedule assignment
    const assignment = await prisma.scheduleAssignment.findFirst({
      where: {
        employeeId,
        date: today,
      },
      include: { shift: true },
    });

    if (!assignment) throw new AppError('Tidak ada jadwal kerja hari ini', 400);

    // Check if already checked in
    const existing = await prisma.attendance.findUnique({
      where: { scheduleAssignmentId: assignment.id },
    });
    if (existing) throw new ConflictError('Absensi sudah tercatat untuk shift ini');

    // Validate check-in time window (max 60 min after shift start)
    const { isValid, isLate } = isWithinCheckinWindow(assignment.shift.startTime, now);
    if (!isValid) {
      throw new AppError(
        `Batas waktu absensi sudah lewat. Absensi diterima maksimal 60 menit setelah shift dimulai pukul ${assignment.shift.startTime}`,
        400
      );
    }

    // Calculate late minutes
    const [h, m] = assignment.shift.startTime.split(':').map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(h, m, 0, 0);
    const lateMinutes = isLate ? Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000)) : 0;

    // Get current pay rate snapshot
    const rateData = await employeeService.getCurrentRate(employeeId);
    const rateSnapshot = rateData.ratePerShift;

    const attendance = await prisma.$transaction(async (tx) => {
      const att = await tx.attendance.create({
        data: {
          scheduleAssignmentId: assignment.id,
          checkInAt: now,
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME,
          lateMinutes,
          selfieFileId: selfieFileId ?? null,
          rateSnapshot,
          createdBy,
        },
        include: {
          scheduleAssignment: { include: { shift: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: createdBy,
          action: 'CHECKIN',
          entityType: 'attendances',
          entityId: att.id,
          afterData: { employeeId, checkInAt: now.toISOString(), status: att.status, lateMinutes },
        },
      });

      return att;
    });

    // Notify owners
    await createNotificationForAllOwners(
      'Karyawan Check-In',
      `Karyawan telah absen pada shift ${assignment.shift.name} - ${today}${isLate ? ` (Terlambat ${lateMinutes} menit)` : ''}`,
      'ATTENDANCE',
      'attendances',
      attendance.id
    );

    return attendance;
  }

  async manualCheckIn(
    scheduleAssignmentId: string,
    reason: string,
    createdBy: string,
    selfieFileId?: string
  ) {
    const assignment = await prisma.scheduleAssignment.findUnique({
      where: { id: scheduleAssignmentId },
      include: { shift: true, employee: { include: { user: { select: { id: true } } } } },
    });
    if (!assignment) throw new NotFoundError('Penugasan shift');

    const existing = await prisma.attendance.findUnique({
      where: { scheduleAssignmentId },
    });
    if (existing) throw new ConflictError('Absensi sudah tercatat untuk shift ini');

    const rateData = await employeeService.getCurrentRate(assignment.employeeId);
    const rateSnapshot = rateData.ratePerShift;

    return prisma.$transaction(async (tx) => {
      const att = await tx.attendance.create({
        data: {
          scheduleAssignmentId,
          checkInAt: new Date(),
          status: AttendanceStatus.MANUAL,
          lateMinutes: 0,
          selfieFileId: selfieFileId ?? null,
          rateSnapshot,
          notes: reason,
          correctedBy: createdBy,
          correctedAt: new Date(),
          createdBy,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: createdBy,
          action: 'MANUAL_CHECKIN',
          entityType: 'attendances',
          entityId: att.id,
          afterData: { scheduleAssignmentId, reason, employeeId: assignment.employeeId, status: 'MANUAL' },
        },
      });

      return att;
    });
  }

  async findAll(query: { date?: string; employeeId?: string; page?: number; limit?: number; month?: string }) {
    const { date, employeeId, page = 1, limit = 20, month } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (date) {
      where.scheduleAssignment = { date };
    }
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = `${year}-${String(m).padStart(2, '0')}-01`;
      const end = `${year}-${String(m).padStart(2, '0')}-31`;
      where.scheduleAssignment = { ...where.scheduleAssignment, date: { gte: start, lte: end } };
    }
    if (employeeId) {
      where.scheduleAssignment = { ...where.scheduleAssignment, employeeId };
    }

    const [data, total] = await prisma.$transaction([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          scheduleAssignment: {
            include: {
              employee: { select: { id: true, fullName: true, code: true } },
              shift: true,
            },
          },
          selfieFile: { select: { id: true, storageKey: true } },
        },
        orderBy: { checkInAt: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMyAttendance(employeeId: string, query: { month?: string }) {
    const where: any = { scheduleAssignment: { employeeId } };
    if (query.month) {
      const [year, m] = query.month.split('-').map(Number);
      const start = `${year}-${String(m).padStart(2, '0')}-01`;
      const end = `${year}-${String(m).padStart(2, '0')}-31`;
      where.scheduleAssignment.date = { gte: start, lte: end };
    }

    return prisma.attendance.findMany({
      where,
      include: {
        scheduleAssignment: { include: { shift: true } },
        selfieFile: { select: { id: true, storageKey: true } },
      },
      orderBy: { checkInAt: 'desc' },
    });
  }

  async correction(
    id: string,
    data: { reason: string; status?: string },
    updatedBy: string
  ) {
    const attendance = await prisma.attendance.findUnique({ where: { id } });
    if (!attendance) throw new NotFoundError('Absensi');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.attendance.update({
        where: { id },
        data: {
          notes: data.reason,
          status: data.status as AttendanceStatus | undefined,
          correctedBy: updatedBy,
          correctedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: updatedBy,
          action: 'CORRECT_ATTENDANCE',
          entityType: 'attendances',
          entityId: id,
          beforeData: { status: attendance.status, notes: attendance.notes },
          afterData: { status: data.status, notes: data.reason },
        },
      });

      return updated;
    });
  }

  async getTodayStatus() {
    const today = format(new Date(), 'yyyy-MM-dd');

    const assignments = await prisma.scheduleAssignment.findMany({
      where: { date: today },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        shift: true,
        attendance: { select: { id: true, status: true, checkInAt: true, lateMinutes: true } },
      },
      orderBy: { shift: { startTime: 'asc' } },
    });

    return assignments;
  }
}

export const attendanceService = new AttendanceService();
