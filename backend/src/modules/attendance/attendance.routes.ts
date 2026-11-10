import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';
import { uploadImage } from '../../shared/middlewares/upload.middleware';
import { fileService } from '../files/file.service';

const router = Router();
router.use(authenticate);

// Employee check-in
router.post('/check-in', uploadImage.single('selfie'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'Foto selfie wajib disertakan' }); return; }
    const fileRecord = await fileService.saveFile(req.file, req.user!.id, 'ATTENDANCE_SELFIE');
    const result = await attendanceService.checkIn(req.user!.employeeId!, fileRecord.id, req.user!.id);
    res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: result });
  } catch (e) { next(e); }
});

// Owner: manual check-in
router.post('/manual', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduleAssignmentId, reason } = req.body;
    const result = await attendanceService.manualCheckIn(scheduleAssignmentId, reason, req.user!.id);
    res.status(201).json({ success: true, message: 'Absensi manual berhasil dicatat', data: result });
  } catch (e) { next(e); }
});

router.get('/', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await attendanceService.findAll(req.query as any);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await attendanceService.findMyAttendance(req.user!.employeeId!, req.query as any);
    res.json({ success: true, data: { items: result, total: result.length } });
  } catch (e) { next(e); }
});

router.get('/today', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await attendanceService.getTodayStatus();
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.patch('/:id/correction', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await attendanceService.correction(req.params.id as string, req.body, req.user!.id);
    res.json({ success: true, message: 'Koreksi absensi berhasil disimpan', data: result });
  } catch (e) { next(e); }
});

export default router;

