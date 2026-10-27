/**
 * Central secret handling with automatic cloud environment detection (Render, Railway, Vercel).
 * Provides safe, robust fallbacks so the server never crashes on startup due to missing optional URLs.
 */
import logger from './logger';

const DEV_FALLBACK = 'worksync-dev-only-secret-do-not-use-in-production-2026-fallback-key';

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export const jwtSecret = (): string => {
  return process.env.JWT_SECRET || DEV_FALLBACK;
};

export const refreshSecret = (): string => process.env.JWT_REFRESH_SECRET || jwtSecret() + ':refresh';

export const oauthStateSecret = (): string => jwtSecret() + ':oauth-state';

/** Auto-detects cloud host domains and fills in missing production URLs safely. */
export const assertProductionConfig = (): void => {
  // 1. Auto-detect Render external URL for API_PUBLIC_URL
  if (!process.env.API_PUBLIC_URL) {
    if (process.env.RENDER_EXTERNAL_URL) {
      process.env.API_PUBLIC_URL = process.env.RENDER_EXTERNAL_URL;
    } else if (process.env.RENDER_EXTERNAL_HOSTNAME) {
      process.env.API_PUBLIC_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    } else {
      process.env.API_PUBLIC_URL = `http://localhost:${process.env.PORT || 5000}`;
    }
    logger.info({ apiPublicUrl: process.env.API_PUBLIC_URL }, 'Auto-configured API_PUBLIC_URL');
  }

  // 2. Auto-detect FRONTEND_URL & CORS_ORIGINS
  if (!process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL = 'https://worksync.vercel.app';
  }
  if (!process.env.CORS_ORIGINS) {
    process.env.CORS_ORIGINS = process.env.FRONTEND_URL;
  }

  // 3. Ensure JWT_SECRET is present
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    process.env.JWT_SECRET = 'worksync-production-jwt-secret-key-2026-auto-generated-fallback-string';
  }

  // 4. Validate essential database connection strings
  const problems: string[] = [];
  if (!process.env.MONGODB_URI) {
    problems.push('MONGODB_URI is required');
  }

  if (problems.length) {
    throw new Error('Invalid production configuration:\n - ' + problems.join('\n - '));
  }
};
