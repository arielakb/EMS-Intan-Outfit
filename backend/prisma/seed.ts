import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Owner user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'intan@intanoutfit.com' },
    update: {},
    create: {
      email: 'intan@intanoutfit.com',
      passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Owner created:', owner.email);

  // 2. Work shifts
  const shiftPagi = await prisma.shift.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
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
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Shift Malam',
      startTime: '14:00',
      endTime: '22:00',
      maxEmployees: 2,
      color: '#6366F1',
    },
  });
  console.log('✅ Work shifts created:', shiftPagi.name, shiftMalam.name);

  // 3. Bonus policy
  const bonusPolicy = await prisma.bonusPolicy.create({
    data: {
      thresholdAmount: BigInt(5_000_000),
      bonusPerThreshold: BigInt(50_000),
      effectiveFrom: new Date('2025-01-01'),
      createdBy: owner.id,
    },
  }).catch(() => null); // ignore if already exists
  if (bonusPolicy) {
    console.log('✅ Bonus policy created: Rp5.000.000 target, Rp50.000 bonus');
  }

  // 4. System settings
  const settings = [
    { key: 'max_late_minutes', value: '60', description: 'Maksimum menit terlambat yang masih diterima' },
    { key: 'sales_deadline_hours', value: '1', description: 'Jam deadline laporan penjualan setelah shift selesai' },
    { key: 'company_name', value: 'Intan Outfit', description: 'Nama perusahaan' },
    { key: 'company_address', value: 'Jl. Contoh No. 1, Kota', description: 'Alamat perusahaan' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.key },
      update: {},
      create: { settingKey: s.key, settingValue: s.value, description: s.description, createdBy: owner.id },
    });
  }
  console.log('✅ System settings created');

  // 5. Sample employee (optional — for testing)
  const empUser = await prisma.user.upsert({
    where: { email: 'karyawan@intanoutfit.com' },
    update: {},
    create: {
      email: 'karyawan@intanoutfit.com',
      passwordHash: await bcrypt.hash('Karyawan123!', 12),
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
  });

  const emp = await prisma.employee.upsert({
    where: { userId: empUser.id },
    update: {},
    create: {
      userId: empUser.id,
      code: 'EMP-001',
      fullName: 'Siti Karyawan',
      phone: '08123456789',
      joinDate: new Date('2025-01-01'),
      employmentStatus: 'ACTIVE',
    },
  });

  await prisma.employeeShiftRate.create({
    data: {
      employeeId: emp.id,
      ratePerShift: BigInt(85_000),
      sickPayPerDay: BigInt(50_000),
      effectiveFrom: new Date('2025-01-01'),
      createdBy: owner.id,
    },
  }).catch(() => null);

  console.log('✅ Sample employee created: karyawan@intanoutfit.com / Karyawan123!');

  console.log('\n🎉 Seeding completed!\n');
  console.log('Default Owner credentials:');
  console.log('  Email: intan@intanoutfit.com');
  console.log('  Password: Admin123!\n');
  console.log('Sample Employee credentials:');
  console.log('  Email: karyawan@intanoutfit.com');
  console.log('  Password: Karyawan123!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
