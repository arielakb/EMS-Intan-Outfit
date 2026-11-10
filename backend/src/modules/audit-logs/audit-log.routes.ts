import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/database/prisma';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate);

// GET all (paginated, owner)
router.get('/', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, pageSize = 20, entityType, action } = req.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action, mode: 'insensitive' };

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(l => ({
          ...l,
          user: l.actor,
          oldValues: l.beforeData as any,
          newValues: l.afterData as any,
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } catch (e) { next(e); }
});

export default router;
