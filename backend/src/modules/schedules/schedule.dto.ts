import { z } from 'zod';

export const createScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  shiftId: z.string().min(1, 'shiftId wajib diisi'),
  employeeIds: z.array(z.string().min(1)).min(1).max(2, 'Maksimal 2 karyawan per shift'),
});

export const updateScheduleSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1).max(2),
});

export const scheduleQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  employeeId: z.string().optional(),
  pageSize: z.string().optional(),
});

export type CreateScheduleDto = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleDto = z.infer<typeof updateScheduleSchema>;
export type ScheduleQueryDto = z.infer<typeof scheduleQuerySchema>;
