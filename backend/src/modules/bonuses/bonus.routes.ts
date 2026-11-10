import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/database/prisma';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';

const router = Router();
router.use(authenticate);

// GET current active bonus policy
router.get('/policy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policy = await prisma.bonusPolicy.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    res.json({ success: true, data: policy });
  } catch (e) { next(e); }
});

// POST create new bonus policy (owner only) - closes old policy
router.post('/policy', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { thresholdAmount, bonusPerThreshold, effectiveFrom } = req.body;
    const from = effectiveFrom ? new Date(effectiveFrom) : new Date();

    // Close current active policy
    await prisma.bonusPolicy.updateMany({
      where: { effectiveTo: null },
      data: { effectiveTo: new Date(from.getTime() - 86400000) },
    });

    const policy = await prisma.bonusPolicy.create({
      data: {
        thresholdAmount: BigInt(thresholdAmount),
        bonusPerThreshold: BigInt(bonusPerThreshold),
        effectiveFrom: from,
        createdBy: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'UPDATE_BONUS_POLICY',
        entityType: 'bonus_policies',
        entityId: policy.id,
        afterData: {
          thresholdAmount: thresholdAmount.toString(),
          bonusPerThreshold: bonusPerThreshold.toString(),
          effectiveFrom: from.toISOString(),
        },
      },
    });

    res.status(201).json({ success: true, message: 'Kebijakan bonus berhasil disimpan', data: policy });
  } catch (e) { next(e); }
});

// GET my bonuses (employee)
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month, pageSize = 50, page = 1 } = req.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = { employeeId: req.user!.employeeId };
    if (year && month) {
      where.salesReport = {
        reportDate: {
          gte: new Date(Number(year), Number(month) - 1, 1),
          lt: new Date(Number(year), Number(month), 1),
        },
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.bonusDetail.findMany({
        where,
        include: {
          salesReport: { select: { id: true, reportDate: true, grossSales: true, status: true } },
          shift: true,
          bonusPolicy: { select: { thresholdAmount: true, bonusPerThreshold: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.bonusDetail.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) { next(e); }
});

// GET all bonuses (owner)
router.get('/', requireOwner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month, employeeId, pageSize = 100, page = 1 } = req.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (year && month) {
      where.salesReport = {
        reportDate: {
          gte: new Date(Number(year), Number(month) - 1, 1),
          lt: new Date(Number(year), Number(month), 1),
        },
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.bonusDetail.findMany({
        where,
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
          salesReport: { select: { id: true, reportDate: true, grossSales: true, status: true } },
          shift: true,
          bonusPolicy: { select: { thresholdAmount: true, bonusPerThreshold: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.bonusDetail.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) { next(e); }
});

export default router;
