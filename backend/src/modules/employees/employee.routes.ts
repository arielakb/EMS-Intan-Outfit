import { Router } from 'express';
import { employeeController } from './employee.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireOwner } from '../../shared/middlewares/role.middleware';
import { validateBody, validateQuery } from '../../shared/middlewares/validate.middleware';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
  addPayRateSchema,
  employeeQuerySchema,
} from './employee.dto';

const router = Router();

router.use(authenticate);

// Employee profile (accessible by employee themselves)
router.get('/me', employeeController.getMyProfile);

// Owner-only routes
router.get('/', requireOwner, validateQuery(employeeQuerySchema), employeeController.getAll);
router.post('/', requireOwner, validateBody(createEmployeeSchema), employeeController.create);
router.get('/:id', requireOwner, employeeController.getById);
router.patch('/:id', requireOwner, validateBody(updateEmployeeSchema), employeeController.update);
router.patch('/:id/status', requireOwner, validateBody(updateEmployeeStatusSchema), employeeController.updateStatus);
router.get('/:id/pay-rates', requireOwner, employeeController.getPayRates);
router.post('/:id/pay-rates', requireOwner, validateBody(addPayRateSchema), employeeController.addPayRate);
router.post('/:id/resend-activation', requireOwner, employeeController.resendActivation);

export default router;

