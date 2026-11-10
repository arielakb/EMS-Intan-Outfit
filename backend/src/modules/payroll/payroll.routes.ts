import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { payrollService } from './payroll.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate);

// Employee: get my payrolls
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.findMyPayrolls(req.user!.employeeId!);
    res.json({ success: true, data: { items: result, total: result.length } });
  } catch (e) { next(e); }
});

// Owner: get all payrolls
router.get('/', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.findAll(req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Owner: generate payroll for all active employees
router.post('/generate', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.body;
    const result = await payrollService.generateAll(Number(month), Number(year), req.user!.id);
    res.status(201).json({
      success: true,
      message: `Payroll digenerate untuk ${result.generated} karyawan`,
      data: result,
    });
  } catch (e) { next(e); }
});

// Get specific payroll
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.findById(req.params.id as string);
    // Access control: employee can only see their own
    if (req.user!.role !== 'OWNER' && result.employeeId !== req.user!.employeeId) {
      res.status(403).json({ success: false, message: 'Akses ditolak' }); return;
    }
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Owner: approve payroll
router.patch('/:id/approve', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.approve(req.params.id as string, req.user!.id);
    res.json({ success: true, message: 'Payroll disetujui', data: result });
  } catch (e) { next(e); }
});

// Owner: add adjustment
router.post('/:id/adjustment', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.addAdjustment(req.params.id as string, req.body, req.user!.id);
    res.json({ success: true, message: 'Koreksi berhasil ditambahkan', data: result });
  } catch (e) { next(e); }
});

// Owner: record payment
router.post('/:id/payment', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await payrollService.recordPayment(req.params.id as string, req.body, req.user!.id);
    res.json({ success: true, message: 'Pembayaran berhasil dicatat', data: result });
  } catch (e) { next(e); }
});

export default router;
