import { assertHttpUrl, safeRequest } from './http';
import { invalidConfig } from './errors';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
// Headers the caller must not control
const FORBIDDEN_HEADERS = /^(host|content-length|connection|transfer-encoding)$/i;

export interface WebhookParams {
  url?: string;
  method?: string;
  headers?: Record<string, any> | string;
  body?: any;
}

const parseMaybeJson = (app: string, value: any, label: string): any => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    if (label === 'headers') throw invalidConfig(app, 'Headers must be a JSON object');
    return value; // plain-text body
  }
};

/** Generic "send_request" action: calls whatever URL the user configured. */
export const sendWebhookRequest = async (params: WebhookParams) => {
  const url = assertHttpUrl('webhook', params.url, { label: 'Request URL' });

  const method = (params.method || 'POST').toString().toUpperCase();
  if (!(METHODS as readonly string[]).includes(method)) {
    throw invalidConfig('webhook', `Unsupported HTTP method "${method}"`);
  }

  const rawHeaders = parseMaybeJson('webhook', params.headers, 'headers') || {};
  if (typeof rawHeaders !== 'object' || Array.isArray(rawHeaders)) {
    throw invalidConfig('webhook', 'Headers must be a JSON object');
  }
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (!FORBIDDEN_HEADERS.test(k)) headers[k] = String(v);
  }

  const body = method === 'GET' ? undefined : parseMaybeJson('webhook', params.body, 'body');
  if (body !== undefined && typeof body === 'object' && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await safeRequest('webhook', {
    method: method as any,
    url: url.toString(),
    headers,
    data: body,
    // Don't let axios parse-fail on odd responses; we only keep a truncated copy
    responseType: 'text',
    transformResponse: (d) => d,
  });

  return {
    message: 'HTTP Webhook dispatched successfully',
    data: {
      // Host only: query strings often carry tokens
      targetHost: url.host,
      method,
      statusCode: res.status,
      responseBody: typeof res.data === 'string' ? res.data.slice(0, 2000) : res.data,
    },
  };
};
