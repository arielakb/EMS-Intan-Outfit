import prisma from '../../shared/database/prisma';
import { NotFoundError, AppError, ConflictError } from '../../shared/errors/AppError';
import { PayrollStatus } from '@prisma/client';
import { createNotification } from '../../shared/utils/notification.utils';
import { format } from 'date-fns';

export class PayrollService {
  /**
   * Generate payroll for a single employee for a given month/year.
   * Counts: shifts worked, sick days, bonus amount
   */
  async generate(employeeId: string, month: number, year: number, createdBy: string) {
    // Check if already exists
    const existing = await prisma.payroll.findUnique({
      where: { employeeId_year_month: { employeeId, year, month } },
    });
    if (existing) throw new ConflictError('Payroll untuk periode ini sudah ada');

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { id: true } } },
    });
    if (!employee) throw new NotFoundError('Karyawan');

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    // Format month boundaries as 'yyyy-MM-dd' for string comparison
    const startStr = format(periodStart, 'yyyy-MM-dd');
    const endStr = format(periodEnd, 'yyyy-MM-dd');

    return prisma.$transaction(async (tx) => {
      // 1. Count shifts worked (attendances with ON_TIME, LATE, or MANUAL)
      const attendances = await tx.attendance.findMany({
        where: {
          scheduleAssignment: {
            employeeId,
            date: { gte: startStr, lte: endStr },
          },
          status: { in: ['ON_TIME', 'LATE', 'MANUAL'] },
        },
        select: { id: true, rateSnapshot: true },
      });

      const shiftsWorked = attendances.length;
      const shiftPay = attendances.reduce((sum, a) => sum + a.rateSnapshot, BigInt(0));

      // 2. Count approved leave days → sick pay
      const approvedLeaves = await tx.leaveRequest.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        select: { totalDays: true },
      });

      const sickDays = approvedLeaves.reduce((sum, l) => sum + l.totalDays, 0);

      // Get current rate for sick pay
      const shiftRate = await tx.employeeShiftRate.findFirst({
        where: {
          employeeId,
          effectiveFrom: { lte: periodEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      const sickPayPerDay = shiftRate?.sickPayPerDay ?? BigInt(50_000);
      const sickPay = BigInt(sickDays) * sickPayPerDay;

      // 3. Sum bonus amounts for this employee in this period
      const bonuses = await tx.bonusDetail.findMany({
        where: {
          employeeId,
          salesReport: {
            reportDate: { gte: periodStart, lte: periodEnd },
            status: 'VERIFIED',
          },
        },
        select: { amount: true },
      });
      const bonusAmount = bonuses.reduce((sum, b) => sum + b.amount, BigInt(0));

      // 4. Net salary
      const netSalary = shiftPay + sickPay + bonusAmount;

      const payroll = await tx.payroll.create({
        data: {
          employeeId,
          year,
          month,
          shiftsWorked,
          shiftPay,
          sickDays,
          sickPay,
          bonusAmount,
          adjustments: BigInt(0),
          netSalary,
          status: PayrollStatus.DRAFT,
          createdBy,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: createdBy,
          action: 'GENERATE_PAYROLL',
          entityType: 'payrolls',
          entityId: payroll.id,
          afterData: {
            employeeId,
            year,
            month,
            shiftsWorked,
            netSalary: netSalary.toString(),
          },
        },
      });

      return payroll;
    });
  }

  /**
   * Generate payroll for ALL active employees for a given month
   */
  async generateAll(month: number, year: number, createdBy: string) {
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true },
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const emp of employees) {
      try {
        const p = await this.generate(emp.id, month, year, createdBy);
        results.push(p);
      } catch (err: any) {
        // Skip if already exists (ConflictError)
        if (err?.statusCode !== 409) {
          errors.push({ employeeId: emp.id, error: err?.message });
        }
      }
    }

    return { generated: results.length, errors };
  }

  async findAll(query: {
    month?: number;
    year?: number;
    status?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || query.pageSize || 20);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.month) where.month = Number(query.month);
    if (query.year) where.year = Number(query.year);

    const [data, total] = await prisma.$transaction([
      prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
          payment: true,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.payroll.count({ where }),
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            code: true,
            user: { select: { id: true } },
          },
        },
        payment: true,
      },
    });
    if (!payroll) throw new NotFoundError('Payroll');
    return payroll;
  }

  async findMyPayrolls(employeeId: string) {
    return prisma.payroll.findMany({
      where: { employeeId },
      include: { payment: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async approve(id: string, approvedBy: string) {
    const payroll = await this.findById(id);
    if (payroll.status === PayrollStatus.PAID) throw new AppError('Payroll sudah dibayar', 400);
    if (payroll.status === PayrollStatus.APPROVED) throw new AppError('Payroll sudah diapprove', 400);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.payroll.update({
        where: { id },
        data: {
          status: PayrollStatus.APPROVED,
          approvedBy,
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: approvedBy,
          action: 'APPROVE_PAYROLL',
          entityType: 'payrolls',
          entityId: id,
          beforeData: { status: payroll.status },
          afterData: { status: 'APPROVED' },
        },
      });

      // Notify employee
      if (payroll.employee?.user?.id) {
        await tx.notification.create({
          data: {
            userId: payroll.employee.user.id,
            title: 'Gaji Disetujui',
            message: `Gaji Anda untuk bulan ${payroll.month}/${payroll.year} telah disetujui`,
            notificationType: 'PAYROLL',
            referenceType: 'payrolls',
            referenceId: id,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Add adjustment (positive or negative) to a payroll
   */
  async addAdjustment(
    id: string,
    data: { amount: number; isPositive: boolean; reason: string },
    updatedBy: string
  ) {
    const payroll = await this.findById(id);
    if (payroll.status === PayrollStatus.PAID) throw new AppError('Payroll sudah dibayar', 400);

    const amount = BigInt(data.amount);
    const delta = data.isPositive ? amount : -amount;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.payroll.update({
        where: { id },
        data: {
          adjustments: { increment: delta },
          netSalary: { increment: delta },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: updatedBy,
          action: 'PAYROLL_ADJUSTMENT',
          entityType: 'payrolls',
          entityId: id,
          afterData: {
            amount: data.amount,
            isPositive: data.isPositive,
            reason: data.reason,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Record payment for an approved payroll
   */
  async recordPayment(
    payrollId: string,
    data: {
      amount: number;
      paymentMethod: 'TRANSFER_BANK' | 'CASH' | 'EWALLET';
      referenceNumber?: string;
      notes?: string;
      proofFileId?: string;
    },
    recordedBy: string
  ) {
    const payroll = await this.findById(payrollId);
    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new AppError('Hanya payroll yang sudah diapprove yang dapat dibayar', 400);
    }
    if (payroll.payment) {
      throw new ConflictError('Pembayaran sudah tercatat');
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          payrollId,
          amount: BigInt(data.amount),
          paymentDate: new Date(),
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          proofFileId: data.proofFileId,
          recordedBy,
        },
      });

      await tx.payroll.update({
        where: { id: payrollId },
        data: { status: PayrollStatus.PAID },
      });

      await tx.auditLog.create({
        data: {
          actorId: recordedBy,
          action: 'RECORD_PAYMENT',
          entityType: 'payments',
          entityId: payment.id,
          afterData: { payrollId, amount: data.amount, method: data.paymentMethod },
        },
      });

      // Notify employee
      if (payroll.employee?.user?.id) {
        await tx.notification.create({
          data: {
            userId: payroll.employee.user.id,
            title: 'Gaji Telah Dibayarkan',
            message: `Gaji Rp${Number(data.amount).toLocaleString('id-ID')} untuk bulan ${payroll.month}/${payroll.year} telah dibayarkan via ${data.paymentMethod}`,
            notificationType: 'PAYROLL',
            referenceType: 'payrolls',
            referenceId: payrollId,
          },
        });
      }

      return payment;
    });
  }
}

export const payrollService = new PayrollService();
