import rateLimit from 'express-rate-limit';

const handler = (message: string) => ({ success: false, message });

// 5 requests / 15 min per IP for login and register
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: handler('Too many attempts. Please try again in 15 minutes.'),
});

// 60 requests / min per IP for public webhook ingestion
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: handler('Webhook rate limit exceeded. Please slow down.'),
});
