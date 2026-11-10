import { Router } from 'express';
import { scheduleController } from './schedule.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';
import { validateBody, validateQuery } from '../../shared/middlewares/validate.middleware';
import { createScheduleSchema, scheduleQuerySchema } from './schedule.dto';

const router = Router();
router.use(authenticate);

router.get('/shifts', scheduleController.getShifts);
router.get('/me', scheduleController.getMySchedule);
router.get('/today', requireOwner, scheduleController.getTodayStatus);

router.get('/', requireOwner, validateQuery(scheduleQuerySchema), scheduleController.getAll);
router.post('/', requireOwner, validateBody(createScheduleSchema), scheduleController.create);
router.get('/:id', requireOwner, scheduleController.getById);
router.delete('/:id', requireOwner, scheduleController.delete);

export default router;
