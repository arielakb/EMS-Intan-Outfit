import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UnauthorizedError } from '../errors/AppError';
import prisma from '../database/prisma';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { employee: { select: { id: true } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Akun tidak aktif');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };

    next();
  } catch (error) {
    next(error);
  }
};
