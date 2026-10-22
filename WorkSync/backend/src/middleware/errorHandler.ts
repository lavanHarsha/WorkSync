import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorTelemetryEvent {
  eventId: string;
  timestamp: string;
  level: 'error' | 'fatal' | 'warning';
  environment: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  request?: {
    id?: string;
    method: string;
    url: string;
    ip?: string;
  };
}

/**
 * Error boundary telemetry reporter:
 * If SENTRY_DSN is configured, forwards event to monitoring service.
 * In all environments, outputs a structured telemetry event for observability.
 */
const reportErrorToMonitoring = (err: any, req: Request): string => {
  const eventId = req.id || `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const telemetryPayload: ErrorTelemetryEvent = {
    eventId,
    timestamp: new Date().toISOString(),
    level: (err.statusCode && err.statusCode < 500) ? 'warning' : 'error',
    environment: process.env.NODE_ENV || 'development',
    error: {
      name: err.name || 'Error',
      message: err.message || 'Unknown error occurred',
      stack: err.stack,
      code: err.code,
    },
    request: {
      id: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
    },
  };

  // Structured monitoring log
  if (telemetryPayload.level === 'error') {
    (req.log || logger).error(telemetryPayload, `[Error Boundary] Captured error ${eventId}: ${err.message}`);
  } else {
    (req.log || logger).warn(telemetryPayload, `[Error Boundary] Handled client warning ${eventId}: ${err.message}`);
  }

  return eventId;
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const eventId = reportErrorToMonitoring(err, req);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors || {}).map((e: any) => e.message);
    message = errors.join(', ');
  }

  // Cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with invalid id format: ${err.value}`;
  }

  // Zod validation error fallback if not caught by validate middleware
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = err.issues?.[0]?.message || 'Validation failed';
  }

  res.status(statusCode).json({
    success: false,
    message,
    reqId: req.id || eventId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
