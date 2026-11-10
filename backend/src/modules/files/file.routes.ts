import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileService } from './file.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { file, filePath } = await fileService.getFile(req.params.id as string, req.user!.id, req.user!.role);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (e) { next(e); }
});

export default router;

