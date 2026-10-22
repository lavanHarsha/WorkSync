export type IntegrationErrorCode =
  | 'NOT_CONNECTED'
  | 'INVALID_CONFIG'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'NETWORK_ERROR'
  | 'REQUEST_REJECTED';

/**
 * Typed failure thrown by every integration module. The worker's retry logic
 * should branch on `retryable` (and may honour `retryAfterMs`) rather than
 * parsing messages.
 *
 * Messages never include URLs, tokens or other credentials.
 */
export class IntegrationError extends Error {
  public readonly app: string;
  public readonly code: IntegrationErrorCode;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly retryAfterMs?: number;

  constructor(
    app: string,
    code: IntegrationErrorCode,
    message: string,
    opts: { retryable?: boolean; statusCode?: number; retryAfterMs?: number } = {}
  ) {
    super(message);
    this.name = 'IntegrationError';
    this.app = app;
    this.code = code;
    this.retryable = opts.retryable ?? false;
    this.statusCode = opts.statusCode;
    this.retryAfterMs = opts.retryAfterMs;
    Object.setPrototypeOf(this, IntegrationError.prototype);
  }
}

export const notConnected = (app: string): IntegrationError =>
  new IntegrationError(app, 'NOT_CONNECTED', `${app} is not connected. Connect it from the Apps page first.`);

export const invalidConfig = (app: string, message: string): IntegrationError =>
  new IntegrationError(app, 'INVALID_CONFIG', message);

/** Maps an HTTP status from a provider to a typed, correctly-retryable error. */
export const fromHttpStatus = (
  app: string,
  status: number,
  detail?: string,
  retryAfterHeader?: string | number
): IntegrationError => {
  const suffix = detail ? `: ${detail.slice(0, 200)}` : '';
  if (status === 429) {
    const seconds = Number(retryAfterHeader);
    return new IntegrationError(app, 'RATE_LIMITED', `${app} rate limit hit${suffix}`, {
      retryable: true,
      statusCode: status,
      retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined,
    });
  }
  if (status === 401 || status === 403) {
    return new IntegrationError(app, 'AUTH_FAILED', `${app} rejected the credentials (HTTP ${status})${suffix}`, {
      statusCode: status,
    });
  }
  if (status === 408 || status >= 500) {
    return new IntegrationError(app, 'UPSTREAM_ERROR', `${app} failed with HTTP ${status}${suffix}`, {
      retryable: true,
      statusCode: status,
    });
  }
  return new IntegrationError(app, 'REQUEST_REJECTED', `${app} rejected the request (HTTP ${status})${suffix}`, {
    statusCode: status,
  });
};

export const networkError = (app: string, reason: string): IntegrationError =>
  new IntegrationError(app, 'NETWORK_ERROR', `${app} request failed: ${reason}`, { retryable: true });

/**
 * Converts an arbitrary SDK/library throw (googleapis, octokit, notion) into an
 * IntegrationError. Already-typed errors pass through unchanged.
 */
export const wrapSdkError = (app: string, err: any): IntegrationError => {
  if (err instanceof IntegrationError) return err;

  const status: number | undefined =
    err?.status ?? err?.response?.status ?? (typeof err?.code === 'number' ? err.code : undefined);

  if (typeof status === 'number' && status >= 100 && status < 600) {
    const retryAfter = err?.response?.headers?.['retry-after'] ?? err?.headers?.['retry-after'];
    return fromHttpStatus(app, status, err?.message, retryAfter);
  }
  // Google's OAuth client reports revoked/expired refresh tokens this way
  if (err?.message && /invalid_grant/i.test(err.message)) {
    return new IntegrationError(app, 'AUTH_FAILED', `${app} authorization expired or was revoked. Reconnect the app.`);
  }
  return networkError(app, err?.code || err?.message || 'unknown error');
};
