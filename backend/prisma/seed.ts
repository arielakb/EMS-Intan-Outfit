import {
  PrismaClient,
  UserRole,
  UserStatus,
  EmploymentStatus,
  AttendanceStatus,
  LeaveStatus,
  SalesReportStatus,
  PayrollStatus,
  PaymentMethod,
  NotificationType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for Intan Outfit EMS...');

  // 1. Password Hashes
  const ownerPassword = await bcrypt.hash('Admin123!', 12);
  const employeePassword = await bcrypt.hash('Karyawan123!', 12);

  // 2. Owner User
  const owner = await prisma.user.upsert({
    where: { email: 'intan@intanoutfit.com' },
    update: { passwordHash: ownerPassword, status: UserStatus.ACTIVE },
    create: {
      email: 'intan@intanoutfit.com',
      passwordHash: ownerPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Owner account:', owner.email);

  // 3. Work Shifts
  const shiftPagi = await prisma.shift.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { startTime: '06:00', endTime: '14:00', maxEmployees: 2, color: '#3B82F6' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Shift Pagi',
      startTime: '06:00',
      endTime: '14:00',
      maxEmployees: 2,
      color: '#3B82F6',
    },
  });

  const shiftMalam = await prisma.shift.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { startTime: '14:00', endTime: '22:00', maxEmployees: 2, color: '#6366F1' },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Shift Malam',
      startTime: '14:00',
      endTime: '22:00',
      maxEmployees: 2,
      color: '#6366F1',
    },
  });
  console.log('✅ Shifts: Shift Pagi (06:00-14:00) & Shift Malam (14:00-22:00)');

  // 4. Bonus Policy
  let bonusPolicy = await prisma.bonusPolicy.findFirst({
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (!bonusPolicy) {
    bonusPolicy = await prisma.bonusPolicy.create({
      data: {
        thresholdAmount: BigInt(5_000_000),
        bonusPerThreshold: BigInt(50_000),
        effectiveFrom: new Date('2025-01-01'),
        createdBy: owner.id,
      },
    });
  }
  console.log('✅ Bonus Policy: Rp5.000.000 target = Rp50.000 bonus');

  // 5. System Settings
  const defaultSettings = [
    { key: 'company_name', value: 'Intan Outfit', description: 'Nama Toko Busana Muslim' },
    { key: 'company_address', value: 'Jl. Malioboro No. 45, Yogyakarta', description: 'Alamat Toko' },
    { key: 'max_late_minutes', value: '15', description: 'Batas toleransi keterlambatan (menit)' },
    { key: 'sales_deadline_hours', value: '1', description: 'Batas waktu input laporan penjualan pasca shift (jam)' },
    { key: 'default_sick_pay', value: '50000', description: 'Uang sakit per hari default (Rp)' },
    { key: 'app_currency', value: 'IDR', description: 'Mata uang aplikasi' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.key },
      update: { settingValue: s.value },
      create: { settingKey: s.key, settingValue: s.value, description: s.description, createdBy: owner.id },
    });
  }
  console.log('✅ System Settings configured');

  // 6. Employees Data
  const employeesData = [
    {
      email: 'karyawan@intanoutfit.com',
      code: 'EMP-001',
      fullName: 'Siti Aminah',
      phone: '081234567890',
      status: UserStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
      ratePerShift: BigInt(85_000),
      sickPayPerDay: BigInt(50_000),
      joinDate: new Date('2025-01-10'),
    },
    {
      email: 'budi@intanoutfit.com',
      code: 'EMP-002',
      fullName: 'Budi Santoso',
      phone: '081298765432',
      status: UserStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
      ratePerShift: BigInt(90_000),
      sickPayPerDay: BigInt(50_000),
      joinDate: new Date('2025-02-01'),
    },
    {
      email: 'dewi@intanoutfit.com',
      code: 'EMP-003',
      fullName: 'Dewi Lestari',
      phone: '081311223344',
      status: UserStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
      ratePerShift: BigInt(85_000),
      sickPayPerDay: BigInt(50_000),
      joinDate: new Date('2025-03-15'),
    },
    {
      email: 'rian@intanoutfit.com',
      code: 'EMP-004',
      fullName: 'Rian Pratama',
      phone: '081355667788',
      status: UserStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
      ratePerShift: BigInt(85_000),
      sickPayPerDay: BigInt(50_000),
      joinDate: new Date('2025-04-01'),
    },
    {
      email: 'maya@intanoutfit.com',
      code: 'EMP-005',
      fullName: 'Maya Indah',
      phone: '081399887766',
      status: UserStatus.PENDING_ACTIVATION,
      employmentStatus: EmploymentStatus.ACTIVE,
      ratePerShift: BigInt(80_000),
      sickPayPerDay: BigInt(50_000),
      joinDate: new Date('2026-11-01'),
    },
    {
      email: 'siti@intanoutfit.com',
      code: 'EMP-006',
      fullName: 'Siti Kasir',
      phone: '081234567811',
      status: UserStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
      ratePerShift: BigInt(85_000),
      sickPayPerDay: BigInt(50_000),
      joinDate: new Date('2025-01-15'),
    },
  ];

  const createdEmployees: any[] = [];

  for (const emp of employeesData) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        status: emp.status,
        passwordHash: emp.status === UserStatus.ACTIVE ? employeePassword : null,
      },
      create: {
        email: emp.email,
        passwordHash: emp.status === UserStatus.ACTIVE ? employeePassword : null,
        role: UserRole.EMPLOYEE,
        status: emp.status,
      },
    });

    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        fullName: emp.fullName,
        phone: emp.phone,
        code: emp.code,
        employmentStatus: emp.employmentStatus,
      },
      create: {
        userId: user.id,
        code: emp.code,
        fullName: emp.fullName,
        phone: emp.phone,
        joinDate: emp.joinDate,
        employmentStatus: emp.employmentStatus,
      },
    });

    // Pay rates
    const existingRate = await prisma.employeeShiftRate.findFirst({
      where: { employeeId: employee.id, effectiveTo: null },
    });
    if (!existingRate) {
      await prisma.employeeShiftRate.create({
        data: {
          employeeId: employee.id,
          ratePerShift: emp.ratePerShift,
          sickPayPerDay: emp.sickPayPerDay,
          effectiveFrom: emp.joinDate,
          createdBy: owner.id,
        },
      });
    }

    createdEmployees.push({ ...employee, user, ratePerShift: emp.ratePerShift });
  }
  console.log(`✅ 5 Employees created/verified (Siti, Budi, Dewi, Rian, Maya)`);

  const activeEmployees = createdEmployees.filter(e => e.user.status === UserStatus.ACTIVE);
  const [siti, budi, dewi, rian] = activeEmployees;

  // 7. Schedule Assignments for November 2026 (Day 1 - 25)
  console.log('⏳ Generating schedule assignments for November 2026...');
  for (let day = 1; day <= 25; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `2026-11-${dayStr}`;

    // Shift Pagi (06:00 - 14:00): Siti & Dewi
    for (const emp of [siti, dewi]) {
      if (!emp) continue;
      await prisma.scheduleAssignment.upsert({
        where: {
          date_employeeId_shiftId: {
            date: dateStr,
            employeeId: emp.id,
            shiftId: shiftPagi.id,
          },
        },
        update: {},
        create: {
          date: dateStr,
          employeeId: emp.id,
          shiftId: shiftPagi.id,
          createdBy: owner.id,
        },
      });
    }

    // Shift Malam (14:00 - 22:00): Budi & Rian
    for (const emp of [budi, rian]) {
      if (!emp) continue;
      await prisma.scheduleAssignment.upsert({
        where: {
          date_employeeId_shiftId: {
            date: dateStr,
            employeeId: emp.id,
            shiftId: shiftMalam.id,
          },
        },
        update: {},
        create: {
          date: dateStr,
          employeeId: emp.id,
          shiftId: shiftMalam.id,
          createdBy: owner.id,
        },
      });
    }
  }
  console.log('✅ Schedules generated for November 1–25, 2026');

  // 8. Attendances (Day 1 - 10)
  console.log('⏳ Recording attendance history (Nov 1 - Nov 10)...');
  for (let day = 1; day <= 10; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `2026-11-${dayStr}`;

    const dayAssignments = await prisma.scheduleAssignment.findMany({
      where: { date: dateStr },
      include: { employee: true, shift: true },
    });

    for (const assign of dayAssignments) {
      const isPagi = assign.shiftId === shiftPagi.id;
      const isLateDay = day === 3 || day === 7;
      const isManualDay = day === 5;

      let status = AttendanceStatus.ON_TIME;
      let lateMinutes = 0;
      let checkIn = new Date(`2026-11-${dayStr}T${isPagi ? '05:50:00' : '13:52:00'}.000Z`);

      if (isLateDay && assign.employee.code === 'EMP-001') {
        status = AttendanceStatus.LATE;
        lateMinutes = 20;
        checkIn = new Date(`2026-11-${dayStr}T06:20:00.000Z`);
      } else if (isManualDay && assign.employee.code === 'EMP-002') {
        status = AttendanceStatus.MANUAL;
        checkIn = new Date(`2026-11-${dayStr}T14:00:00.000Z`);
      }

      await prisma.attendance.upsert({
        where: { scheduleAssignmentId: assign.id },
        update: {
          status,
          lateMinutes,
          checkInAt: checkIn,
          rateSnapshot: assign.employee.id === budi?.id ? BigInt(90_000) : BigInt(85_000),
        },
        create: {
          scheduleAssignmentId: assign.id,
          status,
          lateMinutes,
          checkInAt: checkIn,
          rateSnapshot: assign.employee.id === budi?.id ? BigInt(90_000) : BigInt(85_000),
          notes: status === AttendanceStatus.MANUAL ? 'Absensi manual disetujui owner karena kendala teknis' : undefined,
          createdBy: owner.id,
        },
      });
    }
  }
  console.log('✅ Attendances recorded for Nov 1–10 (On-Time, Late, Manual)');

  // 9. Leave Requests
  console.log('⏳ Inserting leave requests...');
  // Approved Leave
  const existingLeave1 = await prisma.leaveRequest.findFirst({
    where: { employeeId: siti.id, startDate: new Date('2026-11-26T00:00:00.000Z') },
  });
  if (!existingLeave1) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: siti.id,
        startDate: new Date('2026-11-26T00:00:00.000Z'),
        endDate: new Date('2026-11-27T00:00:00.000Z'),
        totalDays: 2,
        reason: 'Sakit flu berat (ada surat dokter terlampir)',
        status: LeaveStatus.APPROVED,
        reviewedBy: owner.id,
        reviewedAt: new Date(),
      },
    });
  }

  // Pending Leave (Waiting for review in Owner Dashboard)
  const existingLeave2 = await prisma.leaveRequest.findFirst({
    where: { employeeId: budi.id, status: LeaveStatus.PENDING },
  });
  if (!existingLeave2) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: budi.id,
        startDate: new Date('2026-11-28T00:00:00.000Z'),
        endDate: new Date('2026-11-29T00:00:00.000Z'),
        totalDays: 2,
        reason: 'Menghadiri pernikahan keluarga di luar kota',
        status: LeaveStatus.PENDING,
      },
    });
  }

  // Rejected Leave
  const existingLeave3 = await prisma.leaveRequest.findFirst({
    where: { employeeId: dewi.id, status: LeaveStatus.REJECTED },
  });
  if (!existingLeave3) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: dewi.id,
        startDate: new Date('2026-11-20T00:00:00.000Z'),
        endDate: new Date('2026-11-20T00:00:00.000Z'),
        totalDays: 1,
        reason: 'Keperluan pribadi mendadak',
        status: LeaveStatus.REJECTED,
        rejectionReason: 'Tidak dapat disetujui karena jadwal shift penuh dan tidak ada pengganti',
        reviewedBy: owner.id,
        reviewedAt: new Date(),
      },
    });
  }
  console.log('✅ Leave requests: 1 Approved, 1 Pending (Review ready), 1 Rejected');

  // 10. Sales Reports & Automatic Bonuses (Nov 1 - Nov 8 verified, Nov 9 submitted, Nov 10 draft)
  console.log('⏳ Inserting sales reports and auto-calculating bonuses...');
  for (let day = 1; day <= 10; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const dateObj = new Date(`2026-11-${dayStr}T00:00:00.000Z`);

    let status = SalesReportStatus.VERIFIED;
    let gross = BigInt(7_500_000 + (day % 3) * 3_500_000); // 7.5jt, 11jt, 14.5jt
    let net = gross - BigInt(150_000);
    let txCount = 35 + day * 3;

    if (day === 9) {
      status = SalesReportStatus.SUBMITTED;
      gross = BigInt(12_500_000);
      net = BigInt(12_300_000);
    } else if (day === 10) {
      status = SalesReportStatus.DRAFT;
      gross = BigInt(6_800_000);
      net = BigInt(6_700_000);
    }

    const existingReport = await prisma.salesReport.findFirst({
      where: { reportDate: dateObj, shiftId: shiftPagi.id },
    });

    let reportId = existingReport?.id;

    if (!existingReport) {
      const created = await prisma.salesReport.create({
        data: {
          reportDate: dateObj,
          shiftId: shiftPagi.id,
          grossSales: gross,
          netSales: net,
          transactionCount: txCount,
          status,
          notes: `Laporan penjualan harian tanggal ${dayStr} November 2026`,
          submittedByEmployeeId: siti.id,
          submittedAt: status !== SalesReportStatus.DRAFT ? new Date() : null,
          verifiedBy: status === SalesReportStatus.VERIFIED ? owner.id : null,
          verifiedAt: status === SalesReportStatus.VERIFIED ? new Date() : null,
          createdBy: siti.user.id,
        },
      });
      reportId = created.id;
    }

    // If verified, generate bonus for shift employees
    if (status === SalesReportStatus.VERIFIED && bonusPolicy && reportId) {
      const multiplier = Math.floor(Number(net) / Number(bonusPolicy.thresholdAmount));
      if (multiplier > 0) {
        const bonusAmount = BigInt(multiplier) * bonusPolicy.bonusPerThreshold;

        for (const emp of [siti, dewi]) {
          const existingBonus = await prisma.bonusDetail.findFirst({
            where: { salesReportId: reportId, employeeId: emp.id },
          });

          if (!existingBonus) {
            await prisma.bonusDetail.create({
              data: {
                salesReportId: reportId,
                employeeId: emp.id,
                shiftId: shiftPagi.id,
                bonusPolicyId: bonusPolicy.id,
                amount: bonusAmount,
                multiplier,
              },
            });
          }
        }
      }
    }
  }
  console.log('✅ Sales reports (8 Verified, 1 Submitted pending review, 1 Draft) & Bonuses generated');

  // 11. Payroll: October 2026 (PAID) & November 2026 (APPROVED)
  console.log('⏳ Creating payroll and payment records...');
  for (const emp of [siti, budi, dewi, rian]) {
    // October 2026 (PAID)
    const existingOct = await prisma.payroll.findFirst({
      where: { employeeId: emp.id, month: 10, year: 2026 },
    });

    let octPayrollId = existingOct?.id;

    if (!existingOct) {
      const shiftsWorked = 24;
      const shiftPay = BigInt(shiftsWorked) * emp.ratePerShift;
      const bonusAmount = BigInt(350_000);
      const sickPay = BigInt(0);
      const adjustments = BigInt(50_000); // kerajinan
      const netSalary = shiftPay + bonusAmount + sickPay + adjustments;

      const oct = await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          month: 10,
          year: 2026,
          shiftsWorked,
          shiftPay,
          sickDays: 0,
          sickPay,
          bonusAmount,
          adjustments,
          netSalary,
          status: PayrollStatus.PAID,
          approvedBy: owner.id,
          approvedAt: new Date('2026-10-31T18:00:00.000Z'),
          createdBy: owner.id,
        },
      });
      octPayrollId = oct.id;

      // Payment proof
      await prisma.payment.create({
        data: {
          payrollId: octPayrollId,
          amount: netSalary,
          paymentDate: new Date('2026-11-01T10:00:00.000Z'),
          paymentMethod: PaymentMethod.TRANSFER_BANK,
          referenceNumber: `TRX-OCT26-${emp.code}`,
          notes: `Gaji bulan Oktober 2026 telah ditransfer ke rekening ${emp.fullName}`,
          recordedBy: owner.id,
        },
      });
    }

    // November 2026 (APPROVED - ready to view/pay)
    const existingNov = await prisma.payroll.findFirst({
      where: { employeeId: emp.id, month: 11, year: 2026 },
    });

    if (!existingNov) {
      const shiftsWorked = 10;
      const shiftPay = BigInt(shiftsWorked) * emp.ratePerShift;
      const bonusAmount = BigInt(200_000);
      const sickPay = BigInt(0);
      const adjustments = BigInt(0);
      const netSalary = shiftPay + bonusAmount + sickPay + adjustments;

      await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          month: 11,
          year: 2026,
          shiftsWorked,
          shiftPay,
          sickDays: 0,
          sickPay,
          bonusAmount,
          adjustments,
          netSalary,
          status: PayrollStatus.APPROVED,
          approvedBy: owner.id,
          approvedAt: new Date('2026-11-10T20:00:00.000Z'),
          createdBy: owner.id,
        },
      });
    }
  }
  console.log('✅ Payrolls: October 2026 (PAID with Transfer Proof) & November 2026 (APPROVED)');

  // 12. Notifications for Owner & Employees
  console.log('⏳ Inserting notifications...');
  const notifications = [
    {
      userId: owner.id,
      title: 'Laporan Penjualan Baru',
      message: 'Laporan penjualan Shift Pagi tanggal 09/11/2026 menunggu verifikasi Anda.',
      notificationType: NotificationType.SALES,
      readAt: null,
    },
    {
      userId: owner.id,
      title: 'Permohonan Cuti Masuk',
      message: 'Budi Santoso mengajukan cuti 2 hari (28/11/2026 - 29/11/2026).',
      notificationType: NotificationType.LEAVE,
      readAt: null,
    },
    {
      userId: siti.user.id,
      title: 'Gaji Oktober 2026 Telah Dibayar',
      message: 'Gaji periode Oktober 2026 telah ditransfer ke rekening Anda.',
      notificationType: NotificationType.PAYROLL,
      readAt: new Date(),
    },
    {
      userId: siti.user.id,
      title: 'Permohonan Izin Disetujui',
      message: 'Permohonan izin sakit tanggal 26/11/2026 telah disetujui Owner.',
      notificationType: NotificationType.LEAVE,
      readAt: null,
    },
    {
      userId: budi.user.id,
      title: 'Jadwal Kerja November',
      message: 'Jadwal shift Anda untuk bulan November 2026 telah diperbarui.',
      notificationType: NotificationType.SCHEDULE,
      readAt: null,
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: n,
    });
  }
  console.log('✅ Real-time notifications created for Owner & Employees');

  // 13. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: owner.id,
        action: 'UPDATE_SCHEDULE',
        entityType: 'schedule_assignments',
        afterData: { note: 'Generated roster shift November 2026' },
      },
      {
        actorId: owner.id,
        action: 'VERIFY_SALES_REPORT',
        entityType: 'sales_reports',
        afterData: { status: 'VERIFIED', verifiedAt: new Date().toISOString() },
      },
      {
        actorId: owner.id,
        action: 'APPROVE_PAYROLL',
        entityType: 'payrolls',
        afterData: { period: '2026-11', status: 'APPROVED' },
      },
      {
        actorId: owner.id,
        action: 'RECORD_PAYMENT',
        entityType: 'payments',
        afterData: { period: '2026-10', method: 'TRANSFER_BANK' },
      },
    ],
  });
  console.log('✅ Audit logs recorded');

  console.log('\n======================================================');
  console.log('🎉 COMPREHENSIVE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('\n🔑 Kredensial untuk Menguji Aplikasi:');
  console.log('------------------------------------------------------');
  console.log('👑 OWNER:');
  console.log('   Email:    intan@intanoutfit.com');
  console.log('   Password: Admin123!');
  console.log('\n👤 KARYAWAN (Bisa dicoba semua):');
  console.log('   1. Siti Aminah:   siti@intanoutfit.com   | Karyawan123!');
  console.log('   2. Budi Santoso:  budi@intanoutfit.com   | Karyawan123!');
  console.log('   3. Dewi Lestari:  dewi@intanoutfit.com   | Karyawan123!');
  console.log('   4. Rian Pratama:  rian@intanoutfit.com   | Karyawan123!');
  console.log('   5. Default User:  karyawan@intanoutfit.com | Karyawan123!');
  console.log('   6. Maya Indah:    maya@intanoutfit.com   | (Pending Aktivasi)');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
