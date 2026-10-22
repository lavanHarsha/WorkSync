import { Router } from 'express';
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  duplicateWorkflow,
  testWorkflow,
  getWorkflowHistory,
  handleIncomingWebhook,
} from '../controllers/workflowController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { webhookLimiter } from '../middleware/rateLimiters';
import {
  idParams,
  getWorkflowsSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  testWorkflowSchema,
  webhookSchema,
} from '../validators/workflowValidators';

const router = Router();

// Public webhook route (so external apps can trigger workflows)
// Signature (X-WorkSync-Signature) is verified inside the handler against the raw body
router.post('/webhook/:webhookId', webhookLimiter, validate(webhookSchema), handleIncomingWebhook);

// Protected routes
router.use(authenticate);

router.get('/', validate(getWorkflowsSchema), getWorkflows);
router.post('/', validate(createWorkflowSchema), createWorkflow);
router.get('/:id', validate(idParams), getWorkflowById);
router.put('/:id', validate(updateWorkflowSchema), updateWorkflow);
router.delete('/:id', validate(idParams), deleteWorkflow);
router.patch('/:id/toggle', validate(idParams), toggleWorkflow);
router.post('/:id/duplicate', validate(idParams), duplicateWorkflow);
router.post('/:id/test', validate(testWorkflowSchema), testWorkflow);
router.get('/:id/history', validate(idParams), getWorkflowHistory);

export default router;
