import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { fileService } from './file.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { file, filePath } = await fileService.getFile(req.params.id as string, req.user!.id, req.user!.role);
    
    // Security headers to prevent Stored XSS and MIME sniffing
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'private, max-age=86400');

    // Sanitize originalName against header injection
    const sanitizedName = file.originalName.replace(/["\r\n\\]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${sanitizedName}"`);

    res.sendFile(filePath);
  } catch (e) { next(e); }
});

export default router;
