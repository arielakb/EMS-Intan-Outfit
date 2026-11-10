import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { salesService } from './sales.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate);

// GET all reports (owner)
router.get('/', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await salesService.findAll(req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// GET my sales reports (employee)
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await salesService.findByEmployee(req.user!.employeeId!, req.query as any);
    res.json({ success: true, data: { items: result, total: result.length } });
  } catch (e) { next(e); }
});

// POST create draft report (employee)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportDate, shiftId, grossSales, netSales, transactionCount, notes } = req.body;
    const report = await salesService.create({
      reportDate,
      shiftId,
      grossSales: Number(grossSales),
      netSales: Number(netSales ?? grossSales),
      transactionCount: Number(transactionCount ?? 0),
      notes,
      submittedByEmployeeId: req.user!.employeeId!,
      createdBy: req.user!.id,
    });
    res.status(201).json({ success: true, message: 'Laporan berhasil disimpan sebagai draft', data: report });
  } catch (e) { next(e); }
});

// PATCH submit (employee) - change DRAFT → SUBMITTED
router.patch('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await salesService.findById(req.params.id as string);
    // Access control: only owner or the submitting employee can submit this report
    if (req.user!.role !== 'OWNER' && existing.submittedByEmployeeId !== req.user!.employeeId) {
      res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk mengirim laporan ini' });
      return;
    }
    const result = await salesService.submit(req.params.id as string, req.user!.id);
    res.json({ success: true, message: 'Laporan berhasil dikirim untuk verifikasi', data: result });
  } catch (e) { next(e); }
});

// PATCH verify or reject (owner)
router.patch('/:id/verify', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await salesService.verify(req.params.id as string, req.body, req.user!.id);
    res.json({ success: true, message: 'Laporan berhasil diproses', data: result });
  } catch (e) { next(e); }
});

// Legacy alias
router.patch('/:id/review', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Map old fields: status 'APPROVED' → 'VERIFIED'
    const body = { ...req.body };
    if (body.status === 'APPROVED') body.status = 'VERIFIED';
    const result = await salesService.verify(req.params.id as string, body, req.user!.id);
    res.json({ success: true, message: 'Laporan berhasil diproses', data: result });
  } catch (e) { next(e); }
});

// GET single
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await salesService.findById(req.params.id as string);
    // Access control: owner can see all; employee can only see their own
    if (req.user!.role !== 'OWNER' && result.submittedByEmployeeId !== req.user!.employeeId) {
      res.status(403).json({ success: false, message: 'Akses ditolak' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

export default router;
