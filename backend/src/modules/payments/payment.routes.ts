import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/database/prisma';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';
import { NotFoundError, AppError } from '../../shared/errors/AppError';
import { uploadFile } from '../../shared/middlewares/upload.middleware';
import { fileService } from '../files/file.service';

const router = Router();
router.use(authenticate, requireOwner);

router.post('/:payrollId/payment', uploadFile.single('proof'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payrollId = String(req.params.payrollId);
    const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new NotFoundError('Payroll');
    if (payroll.status !== 'APPROVED') throw new AppError('Payroll harus berstatus APPROVED sebelum pembayaran', 400);

    const existing = await prisma.payment.findUnique({ where: { payrollId } });
    if (existing) throw new AppError('Pembayaran sudah tercatat', 400);

    const { amount, paymentMethod, referenceNumber, notes } = req.body;
    if (BigInt(amount) !== payroll.netSalary) throw new AppError('Nominal pembayaran harus sama dengan gaji bersih', 400);

    let proofFileId: string | undefined;
    if (req.file) {
      const f = await fileService.saveFile(req.file, req.user!.id, 'PAYMENT_PROOF');
      proofFileId = f.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          payrollId,
          amount: BigInt(amount),
          paymentDate: new Date(),
          paymentMethod: paymentMethod || 'TRANSFER_BANK',
          referenceNumber,
          proofFileId,
          notes,
          recordedBy: req.user!.id,
        },
      });

      await tx.payroll.update({ where: { id: payrollId }, data: { status: 'PAID' } });

      // Get employee user id for notification
      const emp = await tx.employee.findUnique({ where: { id: payroll.employeeId }, include: { user: { select: { id: true } } } });
      if (emp) {
        await tx.notification.create({
          data: {
            userId: emp.user.id,
            title: 'Gaji Telah Dibayarkan',
            message: `Gaji Anda sebesar Rp${payroll.netSalary.toLocaleString('id-ID')} telah dibayarkan`,
            notificationType: 'PAYROLL',
            referenceType: 'payrolls',
            referenceId: payrollId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'RECORD_PAYMENT',
          entityType: 'payments',
          entityId: payment.id,
          afterData: { payrollId, amount: amount.toString(), paymentMethod },
        },
      });

      return payment;
    });

    res.status(201).json({ success: true, message: 'Pembayaran berhasil dicatat', data: result });
  } catch (e) { next(e); }
});

export default router;

