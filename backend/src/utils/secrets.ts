/**
 * Central secret handling. In production a missing/placeholder secret is a hard startup error;
 * outside production a clearly-named dev fallback keeps local setup frictionless.
 */
const DEV_FALLBACK = 'worksync-dev-only-secret-do-not-use-in-production';
const PLACEHOLDER = /replace|change-me|changeme|worksync-dev|worksync-production-jwt-secret/i;

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export const jwtSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (isProduction()) throw new Error('JWT_SECRET is required in production');
  return DEV_FALLBACK;
};

export const refreshSecret = (): string => process.env.JWT_REFRESH_SECRET || jwtSecret() + ':refresh';

export const oauthStateSecret = (): string => jwtSecret() + ':oauth-state';

/** Call once at startup. Throws with every problem listed so a bad deploy fails fast and clearly. */
export const assertProductionConfig = (): void => {
  if (!isProduction()) return;
  const problems: string[] = [];

  const jwt = process.env.JWT_SECRET || '';
  if (jwt.length < 32 || PLACEHOLDER.test(jwt)) problems.push('JWT_SECRET must be a random string of at least 32 characters');
  const refresh = process.env.JWT_REFRESH_SECRET || '';
  if (refresh && (refresh.length < 32 || PLACEHOLDER.test(refresh))) {
    problems.push('JWT_REFRESH_SECRET must be at least 32 random characters (or unset)');
  }
  for (const name of ['MONGODB_URI', 'REDIS_URL', 'API_PUBLIC_URL', 'FRONTEND_URL', 'CORS_ORIGINS']) {
    if (!process.env[name]) problems.push(`${name} is required`);
  }
  for (const name of ['API_PUBLIC_URL', 'FRONTEND_URL']) {
    const v = process.env[name];
    if (v && !/^https:\/\//i.test(v) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(v)) {
      problems.push(`${name} must be an https:// URL`);
    }
  }

  if (problems.length) {
    throw new Error('Invalid production configuration:\n - ' + problems.join('\n - '));
  }
};
