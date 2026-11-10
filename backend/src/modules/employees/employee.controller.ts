import { Request, Response, NextFunction } from 'express';
import { employeeService } from './employee.service';
import { requireOwner } from '../../shared/middlewares/role.middleware';

export class EmployeeController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.findAll(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.findById(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, message: 'Karyawan berhasil ditambahkan', data: result });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.update(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, message: 'Data karyawan berhasil diperbarui', data: result });
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.updateStatus(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, message: 'Status karyawan berhasil diperbarui', data: result });
    } catch (error) { next(error); }
  }

  async getPayRates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.getPayRates(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async addPayRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.addPayRate(req.params.id as string, req.body, req.user!.id);
      res.status(201).json({ success: true, message: 'Tarif upah berhasil ditambahkan', data: result });
    } catch (error) { next(error); }
  }

  async resendActivation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.resendActivation(req.params.id as string);
      res.json({ success: true, message: result.message });
    } catch (error) { next(error); }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.findById(req.user!.employeeId!);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const employeeController = new EmployeeController();

