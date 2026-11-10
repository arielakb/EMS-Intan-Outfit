import prisma from '../../shared/database/prisma';
import { NotFoundError, ConflictError, AppError } from '../../shared/errors/AppError';
import { authService } from '../auth/auth.service';

function generateEmployeeCode(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `EMP${year}${random}`;
}

export class EmployeeService {
  async findAll(query: any) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 20);
    const skip = (page - 1) * pageSize;
    const { search, status } = query;

    const where: any = {};
    if (status) where.employmentStatus = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
        skip,
        take: Number(pageSize),
        include: {
          user: { select: { id: true, email: true, role: true, status: true, lastLoginAt: true } },
          shiftRates: {
            where: { effectiveTo: null },
            orderBy: { effectiveFrom: 'desc' },
            take: 1,
          },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      items: items.map(e => ({
        ...e,
        currentShiftRate: e.shiftRates?.[0] ?? null,
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    };
  }

  async findById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, status: true, lastLoginAt: true } },
        shiftRates: { orderBy: { effectiveFrom: 'desc' } },
      },
    });

    if (!employee) throw new NotFoundError('Karyawan');

    return {
      ...employee,
      currentShiftRate: employee.shiftRates.find(r => !r.effectiveTo) ?? employee.shiftRates[0] ?? null,
    };
  }

  async create(dto: any, createdBy: string) {
    const existingUser = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictError('Email sudah digunakan');

    // Generate unique employee code
    let code: string;
    let isUnique = false;
    do {
      code = generateEmployeeCode();
      const existing = await prisma.employee.findUnique({ where: { code } });
      isUnique = !existing;
    } while (!isUnique);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          role: 'EMPLOYEE',
          status: 'PENDING_ACTIVATION',
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          code,
          fullName: dto.fullName,
          phone: dto.phone,
          address: dto.address,
          joinDate: new Date(dto.joinDate),
        },
      });

      await tx.employeeShiftRate.create({
        data: {
          employeeId: employee.id,
          ratePerShift: BigInt(dto.ratePerShift ?? 85_000),
          sickPayPerDay: BigInt(dto.sickPayPerDay ?? 50_000),
          effectiveFrom: new Date(dto.joinDate),
          createdBy,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: createdBy,
          action: 'CREATE_EMPLOYEE',
          entityType: 'employees',
          entityId: employee.id,
          afterData: { email: dto.email, fullName: dto.fullName },
        },
      });

      return { user, employee };
    });

    // Send activation email
    try {
      await authService.sendActivationEmail(result.user.id, dto.email);
    } catch (err) {
      console.error('Failed to send activation email:', err);
    }

    return result.employee;
  }

  async update(id: string, dto: any, updatedBy: string) {
    const employee = await this.findById(id);

    // If ratePerShift/sickPayPerDay is in dto, create new rate
    if (dto.ratePerShift || dto.sickPayPerDay) {
      const { ratePerShift, sickPayPerDay, ...rest } = dto;

      // Close old rate
      await prisma.employeeShiftRate.updateMany({
        where: { employeeId: id, effectiveTo: null },
        data: { effectiveTo: new Date() },
      });

      await prisma.employeeShiftRate.create({
        data: {
          employeeId: id,
          ratePerShift: BigInt(ratePerShift ?? employee.currentShiftRate?.ratePerShift ?? 85_000),
          sickPayPerDay: BigInt(sickPayPerDay ?? employee.currentShiftRate?.sickPayPerDay ?? 50_000),
          effectiveFrom: new Date(),
          createdBy: updatedBy,
        },
      });

      dto = rest;
    }

    const before = { fullName: employee.fullName, phone: employee.phone, address: employee.address, employmentStatus: employee.employmentStatus };

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        address: dto.address,
        employmentStatus: dto.employmentStatus,
        resignDate: dto.resignDate ? new Date(dto.resignDate) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: updatedBy,
        action: 'UPDATE_EMPLOYEE',
        entityType: 'employees',
        entityId: id,
        beforeData: before,
        afterData: dto,
      },
    });

    return updated;
  }

  async getCurrentRate(employeeId: string): Promise<{ ratePerShift: bigint; sickPayPerDay: bigint }> {
    const rate = await prisma.employeeShiftRate.findFirst({
      where: { employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    return {
      ratePerShift: rate?.ratePerShift ?? BigInt(85_000),
      sickPayPerDay: rate?.sickPayPerDay ?? BigInt(50_000),
    };
  }

  async updateStatus(id: string, dto: { employmentStatus: string; resignDate?: string }, updatedBy: string) {
    const employee = await this.findById(id);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data: {
          employmentStatus: dto.employmentStatus as any,
          resignDate: dto.resignDate ? new Date(dto.resignDate) : undefined,
        },
      });

      // If deactivating, also deactivate user account
      if (dto.employmentStatus === 'INACTIVE' || dto.employmentStatus === 'RESIGNED') {
        await tx.user.update({
          where: { id: employee.userId },
          data: { status: 'INACTIVE' },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: updatedBy,
          action: 'UPDATE_EMPLOYEE_STATUS',
          entityType: 'employees',
          entityId: id,
          beforeData: { employmentStatus: employee.employmentStatus },
          afterData: { employmentStatus: dto.employmentStatus },
        },
      });

      return updated;
    });
  }

  async getPayRates(employeeId: string) {
    return prisma.employeeShiftRate.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async addPayRate(employeeId: string, dto: { ratePerShift?: number; rateAmount?: number; sickPayPerDay?: number; effectiveFrom?: string }, createdBy: string) {
    const from = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const ratePerShift = dto.ratePerShift || dto.rateAmount || 85000;
    const sickPayPerDay = dto.sickPayPerDay ?? 50000;

    // Close current active rate
    await prisma.employeeShiftRate.updateMany({
      where: { employeeId, effectiveTo: null },
      data: { effectiveTo: new Date(from.getTime() - 86400000) },
    });

    const rate = await prisma.employeeShiftRate.create({
      data: {
        employeeId,
        ratePerShift: BigInt(ratePerShift),
        sickPayPerDay: BigInt(sickPayPerDay),
        effectiveFrom: from,
        createdBy,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: createdBy,
        action: 'UPDATE_PAY_RATE',
        entityType: 'employees',
        entityId: employeeId,
        afterData: { ratePerShift, sickPayPerDay },
      },
    });

    return rate;

    return rate;
  }

  async resendActivation(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { id: true, email: true, status: true } } },
    });
    if (!employee) throw new NotFoundError('Karyawan');
    if (employee.user.status !== 'PENDING_ACTIVATION') {
      throw new AppError('Akun karyawan sudah aktif', 400);
    }

    const { authService } = await import('../auth/auth.service');
    await authService.sendActivationEmail(employee.user.id, employee.user.email);
    return { message: 'Email aktivasi telah dikirim ulang' };
  }
}

export const employeeService = new EmployeeService();
