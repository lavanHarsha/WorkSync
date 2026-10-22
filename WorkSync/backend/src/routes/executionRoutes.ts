import { Router } from 'express';
import { getExecutions, getExecutionById, clearHistory, getExecutionStatus } from '../controllers/executionController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getExecutionsSchema, getExecutionByIdSchema } from '../validators/executionValidators';

const router = Router();

router.use(authenticate);

router.get('/', validate(getExecutionsSchema), getExecutions);
router.get('/:id', validate(getExecutionByIdSchema), getExecutionById);
router.get('/:id/status', validate(getExecutionByIdSchema), getExecutionStatus);
router.delete('/', clearHistory);

export default router;
