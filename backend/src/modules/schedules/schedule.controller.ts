import { Request, Response, NextFunction } from 'express';
import { scheduleService } from './schedule.service';

export class ScheduleController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.findAll(req.query as any);
      res.json({ success: true, data: { items: result, total: result.length } });
    } catch (e) { next(e); }
  }

  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.findByEmployee(req.user!.employeeId!, req.query as any);
      res.json({ success: true, data: { items: result, total: result.length } });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.findById(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, message: 'Jadwal berhasil dibuat', data: result });
    } catch (e) { next(e); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.delete(req.params.id as string, req.user!.id);
      res.json({ success: true, message: result.message });
    } catch (e) { next(e); }
  }

  async getShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.getShifts();
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async getTodayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scheduleService.getTodayStatus();
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }
}

export const scheduleController = new ScheduleController();
