import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/database/prisma';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';
import ExcelJS from 'exceljs';

const router = Router();
router.use(authenticate, requireOwner);

// Dashboard stats
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [pendingLeaves, pendingSales, totalEmployees, monthSalesAgg] = await prisma.$transaction([
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.salesReport.count({ where: { status: 'SUBMITTED' } }),
      prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
      prisma.salesReport.aggregate({
        where: { status: 'VERIFIED', reportDate: { gte: monthStart, lte: monthEnd } },
        _sum: { grossSales: true, netSales: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        pending: { leaveRequests: pendingLeaves, salesReports: pendingSales },
        totalActiveEmployees: totalEmployees,
        month: {
          totalSales: (monthSalesAgg._sum.grossSales ?? BigInt(0)).toString(),
          totalNetSales: (monthSalesAgg._sum.netSales ?? BigInt(0)).toString(),
        },
      },
    });
  } catch (e) { next(e); }
});

// Attendance report (monthly summary per employee)
router.get('/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query as any;
    const y = Number(year ?? new Date().getFullYear());
    const m = Number(month ?? new Date().getMonth() + 1);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true, fullName: true, code: true },
    });

    const summary = await Promise.all(employees.map(async (emp) => {
      const assignments = await prisma.scheduleAssignment.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: monthStart.toISOString().split('T')[0], lte: monthEnd.toISOString().split('T')[0] },
        },
        include: { attendance: true },
      });

      const present = assignments.filter(a => a.attendance && a.attendance.status !== 'ABSENT').length;
      const late = assignments.filter(a => a.attendance?.status === 'LATE').length;
      const absent = assignments.filter(a => !a.attendance || a.attendance.status === 'ABSENT').length;

      const leaveDays = await prisma.leaveRequest.count({
        where: {
          employeeId: emp.id,
          status: 'APPROVED',
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
        },
      });

      return {
        employeeId: emp.id,
        fullName: emp.fullName,
        code: emp.code,
        totalScheduled: assignments.length,
        present,
        late,
        absent,
        leave: leaveDays,
      };
    }));

    res.json({ success: true, data: summary });
  } catch (e) { next(e); }
});

// Sales report (monthly summary)
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query as any;
    const y = Number(year ?? new Date().getFullYear());
    const m = Number(month ?? new Date().getMonth() + 1);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    const [agg, bonusAgg] = await prisma.$transaction([
      prisma.salesReport.aggregate({
        where: { status: 'VERIFIED', reportDate: { gte: monthStart, lte: monthEnd } },
        _sum: { grossSales: true, netSales: true, transactionCount: true },
        _count: true,
      }),
      prisma.bonusDetail.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalGrossSales: (agg._sum.grossSales ?? BigInt(0)).toString(),
        totalNetSales: (agg._sum.netSales ?? BigInt(0)).toString(),
        totalTransactions: agg._sum.transactionCount ?? 0,
        totalReports: agg._count,
        totalBonus: (bonusAgg._sum.amount ?? BigInt(0)).toString(),
      },
    });
  } catch (e) { next(e); }
});

// Payroll report (monthly)
router.get('/payroll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query as any;
    const y = Number(year ?? new Date().getFullYear());
    const m = Number(month ?? new Date().getMonth() + 1);

    const payrolls = await prisma.payroll.findMany({
      where: { year: y, month: m },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payrolls });
  } catch (e) { next(e); }
});

// Export to Excel
router.get('/export/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const { year, month } = req.query as any;
    const y = Number(year ?? new Date().getFullYear());
    const m = Number(month ?? new Date().getMonth() + 1);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan');

    // Style header
    const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
    const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };

    if (type === 'attendance') {
      sheet.columns = [
        { header: 'Nama', key: 'name', width: 25 },
        { header: 'Kode', key: 'code', width: 12 },
        { header: 'Total Jadwal', key: 'scheduled', width: 14 },
        { header: 'Hadir', key: 'present', width: 10 },
        { header: 'Terlambat', key: 'late', width: 12 },
        { header: 'Absen', key: 'absent', width: 10 },
        { header: 'Izin', key: 'leave', width: 10 },
      ];
      sheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });

      const employees = await prisma.employee.findMany({ where: { employmentStatus: 'ACTIVE' }, select: { id: true, fullName: true, code: true } });
      for (const emp of employees) {
        const assignments = await prisma.scheduleAssignment.findMany({ where: { employeeId: emp.id, date: { gte: monthStart.toISOString().split('T')[0], lte: monthEnd.toISOString().split('T')[0] } }, include: { attendance: true } });
        const present = assignments.filter(a => a.attendance && a.attendance.status !== 'ABSENT').length;
        const late = assignments.filter(a => a.attendance?.status === 'LATE').length;
        const absent = assignments.filter(a => !a.attendance).length;
        sheet.addRow({ name: emp.fullName, code: emp.code, scheduled: assignments.length, present, late, absent, leave: 0 });
      }

    } else if (type === 'sales') {
      sheet.columns = [
        { header: 'Tanggal', key: 'date', width: 15 },
        { header: 'Karyawan', key: 'employee', width: 20 },
        { header: 'Shift', key: 'shift', width: 15 },
        { header: 'Total Penjualan', key: 'gross', width: 18 },
        { header: 'Transaksi', key: 'txn', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
      ];
      sheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });

      const reports = await prisma.salesReport.findMany({ where: { reportDate: { gte: monthStart, lte: monthEnd } }, include: { submittedByEmployee: { select: { fullName: true } }, shift: true }, orderBy: { reportDate: 'desc' } });
      reports.forEach(r => {
        sheet.addRow({ date: r.reportDate.toLocaleDateString('id-ID'), employee: r.submittedByEmployee?.fullName ?? '-', shift: r.shift?.name ?? '-', gross: Number(r.grossSales), txn: r.transactionCount, status: r.status });
      });

    } else if (type === 'payroll') {
      sheet.columns = [
        { header: 'Nama', key: 'name', width: 25 },
        { header: 'Shift Kerja', key: 'shifts', width: 12 },
        { header: 'Upah Shift', key: 'shiftPay', width: 16 },
        { header: 'Uang Sakit', key: 'sickPay', width: 14 },
        { header: 'Bonus', key: 'bonus', width: 15 },
        { header: 'Penyesuaian', key: 'adj', width: 14 },
        { header: 'Total Gaji', key: 'total', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
      ];
      sheet.getRow(1).eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });

      const payrolls = await prisma.payroll.findMany({ where: { year: y, month: m }, include: { employee: { select: { fullName: true } } }, orderBy: { createdAt: 'asc' } });
      payrolls.forEach(p => {
        sheet.addRow({ name: p.employee.fullName, shifts: p.shiftsWorked, shiftPay: Number(p.shiftPay), sickPay: Number(p.sickPay), bonus: Number(p.bonusAmount), adj: Number(p.adjustments), total: Number(p.netSalary), status: p.status });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${type}-${y}-${m}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (e) { next(e); }
});

export default router;
