import prisma from '../../shared/database/prisma';
import { NotFoundError, AppError } from '../../shared/errors/AppError';
import { LeaveStatus } from '@prisma/client';
import { createNotification, createNotificationForAllOwners } from '../../shared/utils/notification.utils';

export class LeaveService {
  async create(
    employeeId: string,
    dto: { startDate: string; endDate: string; reason: string }
  ) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new AppError('Tanggal selesai tidak boleh sebelum tanggal mulai', 400);
    }

    // Calculate total days (inclusive)
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: dto.reason,
      },
      include: { employee: { select: { fullName: true } } },
    });

    // Notify owner
    await createNotificationForAllOwners(
      'Permohonan Izin Baru',
      `${leave.employee.fullName} mengajukan izin dari ${dto.startDate} sampai ${dto.endDate} (${totalDays} hari)`,
      'LEAVE',
      'leave_requests',
      leave.id
    );

    return leave;
  }

  async findAll(query: { status?: string; employeeId?: string; page?: number; limit?: number }) {
    const { status, employeeId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const [data, total] = await prisma.$transaction([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMyLeaves(employeeId: string, query: { status?: string } = {}) {
    const where: any = { employeeId };
    if (query.status) where.status = query.status;

    return prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    id: string,
    decision: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
    reviewedBy: string
  ) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { fullName: true, user: { select: { id: true } } } } },
    });
    if (!leave) throw new NotFoundError('Permohonan izin');
    if (leave.status !== LeaveStatus.PENDING) throw new AppError('Permohonan sudah diproses', 400);
    if (decision.status === 'REJECTED' && !decision.rejectionReason) {
      throw new AppError('Alasan penolakan wajib diisi', 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: decision.status as LeaveStatus,
          reviewedBy,
          reviewedAt: new Date(),
          rejectionReason: decision.rejectionReason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewedBy,
          action: decision.status === 'APPROVED' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
          entityType: 'leave_requests',
          entityId: id,
          beforeData: { status: 'PENDING' },
          afterData: { status: decision.status, reason: decision.rejectionReason },
        },
      });

      // Notify employee
      await tx.notification.create({
        data: {
          userId: leave.employee.user.id,
          title: decision.status === 'APPROVED' ? 'Permohonan Izin Disetujui' : 'Permohonan Izin Ditolak',
          message:
            decision.status === 'APPROVED'
              ? `Permohonan izin Anda (${leave.totalDays} hari) telah disetujui`
              : `Permohonan izin Anda ditolak: ${decision.rejectionReason}`,
          notificationType: 'LEAVE',
          referenceType: 'leave_requests',
          referenceId: id,
        },
      });

      return updated;
    });
  }
}

export const leaveService = new LeaveService();
