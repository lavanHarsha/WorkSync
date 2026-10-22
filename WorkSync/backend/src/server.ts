import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes';
import workflowRoutes from './routes/workflowRoutes';
import executionRoutes from './routes/executionRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import appsRoutes from './routes/appsRoutes';
import { errorHandler } from './middleware/errorHandler';
import { assertEncryptionKey } from './utils/crypto';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';

dotenv.config();
assertEncryptionKey();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/worksync';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Strict CORS allowlist (comma-separated origins in CORS_ORIGINS). Empty = no cross-origin browser access.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Middlewares
app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = same-origin or non-browser client (curl, webhooks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-WorkSync-Signature', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
);
app.use(cookieParser());
app.use(
  express.json({
    limit: '10mb',
    // Keep the exact bytes so webhook HMAC signatures can be verified
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'WorkSync API Engine',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: REDIS_URL,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/history', executionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/apps', appsRoutes);

// Global Error Handler
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    logger.info({ uri: MONGODB_URI }, 'Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB successfully connected.');

    logger.info({ redisUrl: REDIS_URL }, 'Redis connection configured.');
    logger.info('BullMQ execution worker initialized and listening for jobs.');

    app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, `WorkSync API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
};

startServer();

export default app;
