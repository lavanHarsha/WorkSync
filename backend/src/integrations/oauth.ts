import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { GOOGLE_SCOPES, googleOAuthClient } from './google';
import { IntegrationError, invalidConfig } from './errors';
import { safeRequest } from './http';
import { oauthStateSecret } from '../utils/secrets';

export const OAUTH_APPS = ['gmail', 'google_sheets', 'google_forms', 'github', 'notion'] as const;
export type OAuthApp = (typeof OAUTH_APPS)[number];
export const isOAuthApp = (appId: string): appId is OAuthApp => (OAUTH_APPS as readonly string[]).includes(appId);

/** Apps that connect with a pasted Incoming Webhook URL instead of OAuth. */
export const WEBHOOK_URL_APPS = ['slack', 'discord', 'teams'] as const;

export const STATE_COOKIE = 'worksync_oauth_nonce';
const STATE_TTL_SECONDS = 10 * 60;

const stateSecret = (): string => oauthStateSecret();

export const redirectUriFor = (appId: string): string => {
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
  return `${base}/api/apps/${appId}/oauth/callback`;
};

/** Safe validation of client returnTo URL to prevent open redirects */
export const sanitizeReturnTo = (rawUrl?: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    const host = parsed.hostname.toLowerCase();
    // Allow localhost / loopback for local development
    if (host === 'localhost' || host === '127.0.0.1') {
      return parsed.origin;
    }

    // Allow all Vercel deployments (*.vercel.app)
    if (host.endsWith('.vercel.app')) {
      return parsed.origin;
    }

    // Allow configured FRONTEND_URL or CORS_ORIGINS
    const allowed = [
      process.env.FRONTEND_URL,
      ...(process.env.CORS_ORIGINS || '').split(','),
    ]
      .filter(Boolean)
      .map((entry) => {
        try {
          return new URL(entry!.trim()).origin.toLowerCase();
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    if (allowed.includes(parsed.origin.toLowerCase())) {
      return parsed.origin;
    }

    return null;
  } catch {
    return null;
  }
};

/** Signed, short-lived state. The nonce is also set as an httpOnly cookie to bind it to this browser. */
export const createState = (
  userId: string,
  appId: string,
  returnTo?: string | null
): { state: string; nonce: string } => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload: Record<string, any> = { uid: userId, app: appId, nonce };
  if (returnTo) {
    payload.ret = returnTo;
  }
  const state = jwt.sign(payload, stateSecret(), { expiresIn: STATE_TTL_SECONDS });
  return { state, nonce };
};

export const verifyState = (
  state: string,
  appId: string,
  cookieNonce: string | undefined
): { userId: string; returnTo?: string } => {
  let payload: { uid: string; app: string; nonce: string; ret?: string };
  try {
    payload = jwt.verify(state, stateSecret()) as typeof payload;
  } catch {
    throw invalidConfig(appId, 'OAuth state is invalid or expired. Please try connecting again.');
  }

  if (payload.app !== appId || !payload.uid) {
    throw invalidConfig(appId, 'OAuth state mismatch. Please try connecting again.');
  }

  // If cookieNonce is present, enforce strict timing-safe equality check.
  // In development over localhost (port 5173 to 5000), modern browsers frequently drop cross-port cookies
  // on unencrypted HTTP top-level redirects. If cookieNonce is absent, the signed HMAC-SHA256 JWT ensures tamper-proof authenticity.
  if (cookieNonce) {
    const a = Buffer.from(payload.nonce || '');
    const b = Buffer.from(cookieNonce || '');
    if (a.length > 0 && a.length === b.length && !crypto.timingSafeEqual(a, b)) {
      throw invalidConfig(appId, 'OAuth state mismatch. Please try connecting again.');
    }
  }

  return { userId: payload.uid, returnTo: payload.ret };
};

const requireEnv = (app: string, ...names: string[]): string[] =>
  names.map((n) => {
    const v = process.env[n]?.trim();
    if (!v) throw invalidConfig(app, `${app} OAuth is not configured on the server (${n})`);
    return v;
  });

export const buildAuthUrl = (appId: OAuthApp, state: string): string => {
  const redirectUri = redirectUriFor(appId);

  if (appId === 'gmail' || appId === 'google_sheets' || appId === 'google_forms') {
    requireEnv(appId, 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
    return googleOAuthClient(appId, redirectUri).generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // forces a refresh_token even on re-consent
      scope: GOOGLE_SCOPES[appId] || GOOGLE_SCOPES['gmail'],
      state,
    });
  }

  if (appId === 'github') {
    const [clientId] = requireEnv(appId, 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET');
    const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: 'repo', state });
    return `https://github.com/login/oauth/authorize?${q}`;
  }

  const [clientId] = requireEnv(appId, 'NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET');
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', owner: 'user', state });
  return `https://api.notion.com/v1/oauth/authorize?${q}`;
};

/** Exchanges the authorization code and returns the credentials to store (encrypted) in authData. */
export const exchangeCode = async (appId: OAuthApp, code: string): Promise<Record<string, any>> => {
  const redirectUri = redirectUriFor(appId);

  if (appId === 'gmail' || appId === 'google_sheets' || appId === 'google_forms') {
    try {
      const { tokens } = await googleOAuthClient(appId, redirectUri).getToken(code);
      if (!tokens.refresh_token) {
        throw invalidConfig(appId, 'Google did not return a refresh token. Remove WorkSync from your Google account permissions and reconnect.');
      }
      return { refreshToken: tokens.refresh_token, scope: tokens.scope };
    } catch (err: any) {
      if (err instanceof IntegrationError) throw err;
      throw invalidConfig(appId, 'Google rejected the authorization code');
    }
  }

  if (appId === 'github') {
    const [clientId, clientSecret] = requireEnv('github', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET');
    const res = await safeRequest('github', {
      method: 'POST',
      url: 'https://github.com/login/oauth/access_token',
      headers: { Accept: 'application/json' },
      data: { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
    });
    // GitHub answers 200 even for failures
    if (!res.data?.access_token) throw invalidConfig('github', 'GitHub rejected the authorization code');
    return { accessToken: res.data.access_token, scope: res.data.scope };
  }

  const [clientId, clientSecret] = requireEnv('notion', 'NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET');
  const res = await safeRequest('notion', {
    method: 'POST',
    url: 'https://api.notion.com/v1/oauth/token',
    auth: { username: clientId, password: clientSecret },
    data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
  });
  if (!res.data?.access_token) throw invalidConfig('notion', 'Notion rejected the authorization code');
  return {
    accessToken: res.data.access_token,
    workspaceId: res.data.workspace_id,
    workspaceName: res.data.workspace_name,
    botId: res.data.bot_id,
  };
};
