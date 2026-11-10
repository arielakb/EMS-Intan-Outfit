import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/database/prisma';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate, requireOwner);

// GET all settings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSetting.findMany({ orderBy: { settingKey: 'asc' } });
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// PATCH update setting (by key in body)
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const updated = await prisma.systemSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: String(value), updatedBy: req.user!.id },
      create: { settingKey: key, settingValue: String(value), createdBy: req.user!.id },
    });
    res.json({ success: true, message: 'Pengaturan berhasil disimpan', data: updated });
  } catch (e) { next(e); }
});

// PATCH update setting by key (URL param)
router.patch('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key as string;
    const { settingValue, value } = req.body;
    const updated = await prisma.systemSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: settingValue ?? String(value), updatedBy: req.user!.id },
      create: { settingKey: key, settingValue: settingValue ?? String(value), createdBy: req.user!.id },
    });
    res.json({ success: true, message: 'Pengaturan berhasil disimpan', data: updated });
  } catch (e) { next(e); }
});

export default router;
