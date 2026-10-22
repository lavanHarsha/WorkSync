import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: typeof logger;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const reqId =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()) ||
    crypto.randomUUID();

  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  const childLogger = logger.child({ reqId });
  req.log = childLogger;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    childLogger[level]({
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }, `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export default requestLogger;
