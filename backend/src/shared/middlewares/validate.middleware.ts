import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError';

/** Safely extract Zod issues regardless of Zod version */
function zodIssues(err: any): Array<{ path: string[]; message: string }> {
  // Zod v3 uses .issues; .errors is a getter alias that may not exist in all envs
  const list = err?.issues ?? err?.errors ?? [];
  return Array.isArray(list) ? list : [];
}

function isZodError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.constructor.name === 'ZodError' &&
    (Array.isArray((err as any).issues) || Array.isArray((err as any).errors))
  );
}

function toValidationErrors(err: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  zodIssues(err).forEach((e: any) => {
    const field = Array.isArray(e.path) ? e.path.join('.') : '_root';
    if (!errors[field]) errors[field] = [];
    errors[field].push(e.message ?? 'Tidak valid');
  });
  return errors;
}

export const validateBody = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (isZodError(err)) {
        next(new ValidationError('Validasi gagal', toValidationErrors(err)));
      } else {
        next(err);
      }
    }
  };

export const validate = validateBody;

export const validateQuery = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        (req.query as any)[key] = parsed[key];
      }
      next();
    } catch (err) {
      if (isZodError(err)) {
        next(new ValidationError('Parameter query tidak valid', toValidationErrors(err)));
      } else {
        next(err);
      }
    }
  };
