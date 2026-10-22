import { Router } from 'express';
import { getApps, connectApp, disconnectApp, oauthStart, oauthCallback } from '../controllers/appsController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { connectAppSchema, disconnectAppSchema } from '../validators/appsValidators';

const router = Router();

// Public: the OAuth provider redirects the browser here. Identity comes from the signed state.
router.get('/:appId/oauth/callback', validate(disconnectAppSchema), oauthCallback);

router.use(authenticate);

router.get('/:appId/oauth/start', validate(disconnectAppSchema), oauthStart);

router.get('/', getApps);
router.post('/:appId/connect', validate(connectAppSchema), connectApp);
router.post('/:appId/disconnect', validate(disconnectAppSchema), disconnectApp);

export default router;
