import prisma from '../../shared/database/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../../config/env';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.utils';
import { AppError, UnauthorizedError, NotFoundError } from '../../shared/errors/AppError';
import { AuthTokenPurpose, UserStatus } from '@prisma/client';
import type { LoginDto, ForgotPasswordDto, ResetPasswordDto, ActivateAccountDto } from './auth.dto';

export class AuthService {
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: { employee: { select: { id: true, fullName: true, code: true } } },
    });

    if (!user) {
      throw new UnauthorizedError('Email atau password salah');
    }

    if (user.status === UserStatus.PENDING_ACTIVATION) {
      throw new UnauthorizedError('Akun belum diaktifkan. Silakan cek email aktivasi Anda');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedError('Akun telah dinonaktifkan');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email atau password salah');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      tokens: { accessToken, refreshToken },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.employee?.fullName || user.email,
        employeeId: user.employee?.id,
        employeeCode: user.employee?.code,
        employee: user.employee,
      },
    };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { employee: { select: { id: true } } },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Sesi tidak valid');
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };

    const tokens = {
      accessToken: generateAccessToken(newPayload),
      refreshToken: generateRefreshToken(newPayload),
    };

    return {
      ...tokens,
      tokens,
    };
  }

  async sendActivationEmail(userId: string, email: string): Promise<string> {
    // Invalidate previous tokens
    await prisma.authToken.updateMany({
      where: {
        userId,
        purpose: AuthTokenPurpose.ACCOUNT_ACTIVATION,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Generate new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.authToken.create({
      data: {
        userId,
        tokenHash,
        purpose: AuthTokenPurpose.ACCOUNT_ACTIVATION,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Only log token links in development environment for debugging purposes
    if (env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Activation link: ${env.FRONTEND_URL}/activate?token=${rawToken}`);
    }
    
    return rawToken;
  }

  async activateAccount(dto: ActivateAccountDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        purpose: AuthTokenPurpose.ACCOUNT_ACTIVATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!authToken) {
      throw new AppError('Token aktivasi tidak valid atau sudah kedaluwarsa', 400);
    }

    if (authToken.user.status === UserStatus.ACTIVE) {
      throw new AppError('Akun sudah aktif', 400);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: {
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Akun berhasil diaktifkan' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user || user.status === UserStatus.INACTIVE) {
      return { message: 'Jika email terdaftar, instruksi reset password akan dikirimkan' };
    }

    // Invalidate previous tokens
    await prisma.authToken.updateMany({
      where: {
        userId: user.id,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.authToken.create({
      data: {
        userId: user.id,
        tokenHash,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Only log reset link in development environment
    if (env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] Reset link: ${env.FRONTEND_URL}/reset-password?token=${rawToken}`);
    }

    return { message: 'Jika email terdaftar, instruksi reset password akan dikirimkan' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const authToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!authToken) {
      throw new AppError('Token reset password tidak valid atau sudah kedaluwarsa', 400);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password berhasil diubah' };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            code: true,
            phone: true,
            joinDate: true,
            employmentStatus: true,
            shiftRates: {
              where: { effectiveTo: null },
              orderBy: { effectiveFrom: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Pengguna');
    }

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new AppError('Pengguna tidak ditemukan', 404);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Password saat ini tidak sesuai', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password berhasil diubah' };
  }
}

export const authService = new AuthService();
