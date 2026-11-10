import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenError } from '../errors/AppError';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Akses ditolak'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Hak akses tidak mencukupi'));
      return;
    }

    next();
  };
};

export const requireOwner = requireRole(UserRole.OWNER);
export const requireEmployee = requireRole(UserRole.EMPLOYEE);
