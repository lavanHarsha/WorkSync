import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'confirmPassword',
      'currentPassword',
      'newPassword',
      'token',
      'refreshToken',
      'authData',
      '*.authData',
      '*.password',
      'webhookSecret',
      '*.webhookSecret',
      'refreshTokenHash',
    ],
    censor: '[REDACTED]',
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;
