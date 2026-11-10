import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { validateBody } from '../../shared/middlewares/validate.middleware';
import {
  loginSchema,
  activateAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from './auth.dto';

const router = Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/activate', validateBody(activateAccountSchema), authController.activate);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.patch('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService } = await import('./auth.service');
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true, message: result.message });
  } catch (e) { next(e); }
});

export default router;
