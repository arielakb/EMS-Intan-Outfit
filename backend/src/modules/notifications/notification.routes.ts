import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/database/prisma';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate);

// Get notifications (paginated)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, pageSize = 20, isRead } = req.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { userId: req.user!.id };
    if (isRead === 'true') where.readAt = { not: null };
    if (isRead === 'false') where.readAt = null;

    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(n => ({
          ...n,
          isRead: n.readAt !== null,
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } catch (e) { next(e); }
});

// Mark one as read
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id as string, userId: req.user!.id },
      data: { readAt: new Date() },
    });
    res.json({ success: true, message: 'Notifikasi ditandai dibaca' });
  } catch (e) { next(e); }
});

// Mark all as read
router.patch('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true, message: 'Semua notifikasi ditandai dibaca' });
  } catch (e) { next(e); }
});

export default router;
