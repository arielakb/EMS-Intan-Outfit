import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from './AppError';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    const issues = err.issues || (err as any).errors || [];
    issues.forEach((e: any) => {
      const field = e.path && e.path.length > 0 ? e.path.join('.') : 'general';
      if (!errors[field]) errors[field] = [];
      errors[field].push(e.message);
    });
    res.status(422).json({
      success: false,
      message: 'Validasi gagal',
      errors,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'Data sudah ada (duplikasi)',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Data tidak ditemukan',
      });
      return;
    }
  }

  // Handle our custom errors
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Generic error
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server' : err.message,
  });
};
