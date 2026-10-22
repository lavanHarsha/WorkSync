import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);

export default router;
