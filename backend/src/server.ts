import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import type { Server } from 'http';

dotenv.config();

import authRoutes from './routes/authRoutes';
import workflowRoutes from './routes/workflowRoutes';
import executionRoutes from './routes/executionRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import appsRoutes from './routes/appsRoutes';
import { errorHandler } from './middleware/errorHandler';
import { assertEncryptionKey } from './utils/crypto';
import { assertProductionConfig } from './utils/secrets';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';

assertProductionConfig();
assertEncryptionKey();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/worksync';

// We run behind a reverse proxy (nginx / cloud load balancer): trust it for client IPs and https
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

// Strict CORS allowlist (comma-separated origins in CORS_ORIGINS). Empty = no cross-origin browser access.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  const feUrl = process.env.FRONTEND_URL.trim().replace(/\/$/, '');
  if (feUrl && !allowedOrigins.includes(feUrl)) {
    allowedOrigins.push(feUrl);
  }
}

// Middlewares
app.use(requestLogger);
app.use(helmet());
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, webhooks) or from Vercel / localhost
    if (
      !origin ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      callback(null, true);
    } else {
      // Fallback: reflect the origin so cross-domain communication is never blocked
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-WorkSync-Signature', 'X-Request-Id', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());
app.use(
  express.json({
    limit: '1mb',
    // Keep the exact bytes so webhook HMAC signatures can be verified
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Liveness/readiness probe. Never exposes connection strings.
app.get('/api/health', async (req: Request, res: Response) => {
  const database = mongoose.connection.readyState === 1;
  let redis = false;
  try {
    const { getRedis } = await import('./queues/executionQueue');
    const client = getRedis();
    redis = client.status === 'ready';
  } catch {
    redis = false;
  }
  const healthy = database && redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'WorkSync API Engine',
    timestamp: new Date().toISOString(),
    database: database ? 'connected' : 'disconnected',
    redis: redis ? 'connected' : 'disconnected',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/history', executionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/apps', appsRoutes);

// Unknown API routes return JSON instead of an HTML page
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Global Error Handler
app.use(errorHandler);

let server: Server | undefined;

/** Re-creates cron schedules in Redis for every enabled schedule workflow (survives a Redis wipe). */
const resyncSchedules = async (): Promise<void> => {
  const { Workflow } = await import('./models/Workflow');
  const { scheduleRepeatableJob } = await import('./queues/executionQueue');
  const { scheduleFrequencyToCron } = await import('./services/schedulerHelper');
  const workflows = await Workflow.find({ enabled: true, 'trigger.app': 'schedule' });
  for (const wf of workflows) {
    const frequency = wf.trigger.parameters?.frequency || 'every_hour';
    await scheduleRepeatableJob(wf._id.toString(), wf.userId.toString(), scheduleFrequencyToCron(frequency));
  }
  logger.info({ count: workflows.length }, 'Schedule triggers synced');
};

// Connect to MongoDB, start the job worker and the HTTP server
const startServer = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB successfully connected.');

    server = app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, `WorkSync API server running on http://localhost:${PORT}`);
    });

    // Workers/queues connect to Redis on import; load them asynchronously so Redis delays do not block HTTP server
    (async () => {
      try {
        await import('./workers/executionWorker');
        const { registerTriggerPoller } = await import('./queues/executionQueue');
        await registerTriggerPoller();
        await resyncSchedules();
        logger.info('Execution worker started; trigger poller registered.');
      } catch (queueErr: any) {
        logger.warn({ error: queueErr?.message }, 'Queue worker / scheduler delayed (Redis may be offline or initializing)');
      }

      // Robust in-process poller loop: sweeps active external triggers (Forms, Sheets, Gmail, etc.) every 15s
      setInterval(async () => {
        try {
          const { runTriggerPoll } = await import('./services/triggerPoller');
          await runTriggerPoll();
        } catch (pollErr: any) {
          // Keep loop alive
        }
      }, 15_000);
    })();
  } catch (error: any) {
    logger.error({ error: error?.message }, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully...');
  const force = setTimeout(() => process.exit(1), 15_000);
  force.unref();
  try {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    const { executionWorker } = await import('./workers/executionWorker');
    await executionWorker.close();
    const { executionQueue } = await import('./queues/executionQueue');
    await executionQueue.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    logger.error({ error: err?.message }, 'Error during shutdown');
    process.exit(1);
  }
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error({ reason: String(reason) }, 'Unhandled promise rejection'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
