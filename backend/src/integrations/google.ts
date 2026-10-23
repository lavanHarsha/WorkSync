import { google } from 'googleapis';
import { invalidConfig } from './errors';

export const GOOGLE_SCOPES: Record<string, string[]> = {
  gmail: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
  google_sheets: ['https://www.googleapis.com/auth/spreadsheets'],
  google_forms: ['https://www.googleapis.com/auth/forms.responses.readonly', 'https://www.googleapis.com/auth/forms.body.readonly'],
};

export const googleOAuthClient = (app: string, redirectUri?: string) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw invalidConfig(app, 'Google OAuth is not configured on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/** OAuth2 client authorised with a user's stored refresh token; access tokens are minted on demand. */
export const googleClientForRefreshToken = (app: string, refreshToken: unknown) => {
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw invalidConfig(app, `Stored ${app} credentials are missing a refresh token. Reconnect the app.`);
  }
  const client = googleOAuthClient(app);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
};
