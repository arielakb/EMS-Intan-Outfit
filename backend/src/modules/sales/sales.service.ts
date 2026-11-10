import prisma from '../../shared/database/prisma';
import { NotFoundError, AppError, ConflictError } from '../../shared/errors/AppError';
import { SalesReportStatus } from '@prisma/client';
import { isSalesReportLate, calculateBonusMultiple } from '../../shared/utils/date.utils';
import { createNotificationForAllOwners, createNotification } from '../../shared/utils/notification.utils';
import { format } from 'date-fns';

export class SalesService {
  /**
   * Create a draft sales report
   */
  async create(dto: {
    reportDate: string;
    shiftId: string;
    grossSales: number;
    netSales: number;
    transactionCount?: number;
    notes?: string;
    submittedByEmployeeId: string;
    createdBy: string;
  }) {
    // Validate shift
    const shift = await prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new NotFoundError('Shift');

    // Check no existing report for this date+shift+employee
    const existing = await prisma.salesReport.findFirst({
      where: {
        reportDate: new Date(dto.reportDate),
        shiftId: dto.shiftId,
        submittedByEmployeeId: dto.submittedByEmployeeId,
      },
    });
    if (existing) throw new ConflictError('Laporan penjualan untuk shift ini sudah ada');

    const report = await prisma.salesReport.create({
      data: {
        reportDate: new Date(dto.reportDate),
        shiftId: dto.shiftId,
        submittedByEmployeeId: dto.submittedByEmployeeId,
        grossSales: BigInt(dto.grossSales),
        netSales: BigInt(dto.netSales),
        transactionCount: dto.transactionCount ?? 0,
        notes: dto.notes,
        status: SalesReportStatus.DRAFT,
        createdBy: dto.createdBy,
      },
      include: {
        shift: true,
        submittedByEmployee: { select: { id: true, fullName: true } },
      },
    });

    return report;
  }

  /**
   * Submit a draft report (change status to SUBMITTED)
   */
  async submit(id: string, submittedBy: string) {
    const report = await prisma.salesReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError('Laporan penjualan');
    if (report.status !== SalesReportStatus.DRAFT) {
      throw new AppError('Hanya laporan berstatus draft yang dapat disubmit', 400);
    }

    // Check deadline: 1 hour after shift end. Late reports can still be submitted and verified.
    const shift = await prisma.shift.findUnique({ where: { id: report.shiftId } });
    let isLate = false;
    if (shift) {
      const now = new Date();
      isLate = isSalesReportLate(shift.endTime, now);
    }

    const updated = await prisma.salesReport.update({
      where: { id },
      data: {
        status: SalesReportStatus.SUBMITTED,
        submittedAt: new Date(),
        notes: isLate
          ? (report.notes ? `${report.notes} [Terlambat]` : '[Terlambat]')
          : report.notes,
      },
    });

    // Notify owners
    await createNotificationForAllOwners(
      isLate ? 'Laporan Penjualan (Terlambat)' : 'Laporan Penjualan Baru',
      `Laporan penjualan ${format(report.reportDate, 'dd/MM/yyyy')} telah disubmit${isLate ? ' (Terlambat)' : ''}. Total: Rp${Number(report.grossSales).toLocaleString('id-ID')}`,
      'SALES',
      'sales_reports',
      id
    );

    return updated;
  }

  async findAll(query: {
    status?: string;
    page?: number;
    limit?: number;
    date?: string;
    month?: string;
  }) {
    const { status, page = 1, limit = 20, date, month } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (date) where.reportDate = new Date(date);
    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.reportDate = {
        gte: new Date(year, m - 1, 1),
        lte: new Date(year, m, 0),
      };
    }

    const [data, total] = await prisma.$transaction([
      prisma.salesReport.findMany({
        where,
        skip,
        take: limit,
        include: {
          shift: true,
          submittedByEmployee: { select: { id: true, fullName: true } },
          bonusDetails: { include: { employee: { select: { id: true, fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesReport.count({ where }),
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEmployee(employeeId: string, query: { status?: string; month?: string }) {
    const where: any = { submittedByEmployeeId: employeeId };
    if (query.status) where.status = query.status;
    if (query.month) {
      const [year, m] = query.month.split('-').map(Number);
      where.reportDate = {
        gte: new Date(year, m - 1, 1),
        lte: new Date(year, m, 0),
      };
    }

    return prisma.salesReport.findMany({
      where,
      include: {
        shift: true,
        bonusDetails: { select: { id: true, amount: true, multiplier: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const report = await prisma.salesReport.findUnique({
      where: { id },
      include: {
        shift: true,
        submittedByEmployee: { select: { id: true, fullName: true } },
        bonusDetails: {
          include: { employee: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!report) throw new NotFoundError('Laporan penjualan');
    return report;
  }

  /**
   * Verify or reject a submitted sales report
   * On VERIFIED: auto-calculate bonus for all employees on that shift+date
   */
  async verify(
    id: string,
    decision: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string },
    verifiedBy: string
  ) {
    const report = await this.findById(id);
    if (report.status !== SalesReportStatus.SUBMITTED) {
      throw new AppError('Hanya laporan berstatus submitted yang dapat diverifikasi', 400);
    }
    if (decision.status === 'REJECTED' && !decision.rejectionReason) {
      throw new AppError('Alasan penolakan wajib diisi', 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.salesReport.update({
        where: { id },
        data: {
          status: decision.status as SalesReportStatus,
          verifiedBy,
          verifiedAt: new Date(),
          rejectionReason: decision.rejectionReason,
        },
      });

      if (decision.status === 'VERIFIED') {
        // Find active bonus policy for report date
        const policy = await tx.bonusPolicy.findFirst({
          where: {
            effectiveFrom: { lte: report.reportDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: report.reportDate } }],
          },
          orderBy: { effectiveFrom: 'desc' },
        });

        if (policy) {
          const multiplier = calculateBonusMultiple(report.grossSales, policy.thresholdAmount);

          if (multiplier > 0) {
            const bonusPerEmployee = policy.bonusPerThreshold * BigInt(multiplier);

            // Find all employees assigned to this shift on this date
            const dateStr = format(report.reportDate, 'yyyy-MM-dd');
            const shiftAssignments = await tx.scheduleAssignment.findMany({
              where: { date: dateStr, shiftId: report.shiftId },
              include: {
                employee: { include: { user: { select: { id: true } } } },
              },
            });

            const targetEmployees: { employeeId: string; userId?: string }[] = [];
            if (shiftAssignments.length > 0) {
              for (const a of shiftAssignments) {
                targetEmployees.push({ employeeId: a.employeeId, userId: a.employee?.user?.id });
              }
            } else {
              const subEmp = await tx.employee.findUnique({
                where: { id: report.submittedByEmployeeId },
                include: { user: { select: { id: true } } },
              });
              if (subEmp) {
                targetEmployees.push({ employeeId: subEmp.id, userId: subEmp.user.id });
              }
            }

            for (const target of targetEmployees) {
              // Skip if bonus already exists
              const existingBonus = await tx.bonusDetail.findUnique({
                where: { salesReportId_employeeId: { salesReportId: id, employeeId: target.employeeId } },
              });
              if (existingBonus) continue;

              await tx.bonusDetail.create({
                data: {
                  salesReportId: id,
                  employeeId: target.employeeId,
                  shiftId: report.shiftId,
                  bonusPolicyId: policy.id,
                  amount: bonusPerEmployee,
                  multiplier,
                },
              });

              // Notify employee
              if (target.userId) {
                await tx.notification.create({
                  data: {
                    userId: target.userId,
                    title: 'Bonus Penjualan Diterima',
                    message: `Bonus Rp${Number(bonusPerEmployee).toLocaleString('id-ID')} dari penjualan ${format(report.reportDate, 'dd/MM/yyyy')} telah diverifikasi`,
                    notificationType: 'BONUS',
                    referenceType: 'sales_reports',
                    referenceId: id,
                  },
                });
              }
            }
          }
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: verifiedBy,
          action: decision.status === 'VERIFIED' ? 'VERIFY_SALES_REPORT' : 'REJECT_SALES_REPORT',
          entityType: 'sales_reports',
          entityId: id,
          beforeData: { status: 'SUBMITTED' },
          afterData: { status: decision.status, reason: decision.rejectionReason },
        },
      });

      // Notify submitter
      const employee = await tx.employee.findUnique({
        where: { id: report.submittedByEmployeeId },
        include: { user: { select: { id: true } } },
      });
      if (employee) {
        await tx.notification.create({
          data: {
            userId: employee.user.id,
            title: decision.status === 'VERIFIED' ? 'Laporan Penjualan Diverifikasi' : 'Laporan Penjualan Ditolak',
            message:
              decision.status === 'VERIFIED'
                ? `Laporan penjualan ${format(report.reportDate, 'dd/MM/yyyy')} Anda telah diverifikasi`
                : `Laporan penjualan Anda ditolak: ${decision.rejectionReason}`,
            notificationType: 'SALES',
            referenceType: 'sales_reports',
            referenceId: id,
          },
        });
      }

      return updated;
    });
  }
}

export const salesService = new SalesService();
