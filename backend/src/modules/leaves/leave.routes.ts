import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { leaveService } from './leave.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate);

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await leaveService.create(req.user!.employeeId!, req.body);
    res.status(201).json({ success: true, message: 'Permohonan berhasil diajukan', data: result });
  } catch (e) { next(e); }
});

router.get('/', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await leaveService.findAll(req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await leaveService.findMyLeaves(req.user!.employeeId!);
    res.json({ success: true, data: { items: result, total: result.length } });
  } catch (e) { next(e); }
});

router.patch('/:id/review', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await leaveService.review(req.params.id as string, req.body, req.user!.id);
    res.json({ success: true, message: 'Permohonan berhasil diproses', data: result });
  } catch (e) { next(e); }
});

export default router;

