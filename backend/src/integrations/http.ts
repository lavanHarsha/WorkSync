import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import axios, { AxiosRequestConfig } from 'axios';
import { IntegrationError, fromHttpStatus, invalidConfig, networkError } from './errors';

const allowPrivate = (): boolean => process.env.ALLOW_PRIVATE_WEBHOOK_TARGETS === 'true';

const isPrivateAddress = (address: string): boolean => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) // CGNAT
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
};

/**
 * DNS lookup that refuses private/loopback/link-local targets. Hooking the
 * lookup (instead of pre-resolving) means the connection uses the exact IP we
 * validated, so DNS rebinding can't swap it afterwards.
 */
const guardedLookup: any = (hostname: string, options: any, callback: any) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err, address, family);
    const addrs: string[] = Array.isArray(address) ? address.map((a: any) => a.address) : [address as string];
    if (!allowPrivate() && addrs.some(isPrivateAddress)) {
      return callback(new Error('BLOCKED_PRIVATE_ADDRESS'), address, family);
    }
    callback(null, address, family);
  });
};

const httpAgent = new http.Agent({ lookup: guardedLookup });
const httpsAgent = new https.Agent({ lookup: guardedLookup });

export const assertHttpUrl = (app: string, raw: unknown, opts: { hosts?: RegExp; label?: string } = {}): URL => {
  const label = opts.label || 'URL';
  if (typeof raw !== 'string' || !raw.trim()) {
    throw invalidConfig(app, `${label} is required`);
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw invalidConfig(app, `${label} is not a valid URL`);
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && allowPrivate())) {
    throw invalidConfig(app, `${label} must use https`);
  }
  if (opts.hosts && !opts.hosts.test(url.hostname)) {
    throw invalidConfig(app, `${label} host is not an expected ${app} host`);
  }
  // The DNS lookup guard never runs for IP-literal hosts, so check them here
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal) && !allowPrivate() && isPrivateAddress(literal)) {
    throw invalidConfig(app, `${label} points to a private or internal address, which is not allowed`);
  }
  return url;
};

export interface SafeResponse {
  status: number;
  headers: Record<string, any>;
  data: any;
}

/**
 * Single outbound HTTP entry point for webhook-style integrations.
 * Throws IntegrationError for network failures and non-2xx responses.
 * Never follows redirects and never echoes the URL in errors.
 */
export const safeRequest = async (app: string, config: AxiosRequestConfig): Promise<SafeResponse> => {
  try {
    const res = await axios.request({
      timeout: 10_000,
      maxRedirects: 0,
      maxContentLength: 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      httpAgent,
      httpsAgent,
      validateStatus: () => true,
      ...config,
    });

    if (res.status < 200 || res.status >= 300) {
      const detail = typeof res.data === 'string' ? res.data : undefined;
      throw fromHttpStatus(app, res.status, detail, res.headers?.['retry-after']);
    }
    return { status: res.status, headers: res.headers as Record<string, any>, data: res.data };
  } catch (err: any) {
    if (err instanceof IntegrationError) throw err;
    if (err?.message === 'BLOCKED_PRIVATE_ADDRESS' || err?.cause?.message === 'BLOCKED_PRIVATE_ADDRESS') {
      throw invalidConfig(app, 'Target resolves to a private or internal address, which is not allowed');
    }
    throw networkError(app, err?.code || (axios.isAxiosError(err) ? 'request error' : 'unknown error'));
  }
};
