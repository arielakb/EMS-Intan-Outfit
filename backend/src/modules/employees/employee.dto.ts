import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.string().email('Email tidak valid'),
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(150),
  phone: z.string().optional(),
  address: z.string().optional(),
  position: z.string().optional(),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD'),
  initialRate: z.number().int().min(1, 'Tarif harus lebih dari 0').optional(),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(2).max(150).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  position: z.string().optional(),
});

export const updateEmployeeStatusSchema = z.object({
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED']),
});

export const addPayRateSchema = z.object({
  ratePerShift: z.number().int().min(1).optional(),
  rateAmount: z.number().int().min(1).optional(),
  sickPayPerDay: z.number().int().min(0).optional().default(50000),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD').optional(),
});

export const employeeQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED']).optional(),
}).passthrough();

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type UpdateEmployeeStatusDto = z.infer<typeof updateEmployeeStatusSchema>;
export type AddPayRateDto = z.infer<typeof addPayRateSchema>;
export type EmployeeQueryDto = z.infer<typeof employeeQuerySchema>;

