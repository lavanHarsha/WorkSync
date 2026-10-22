import { google } from 'googleapis';
import { getCredentials } from './credentials';
import { googleClientForRefreshToken } from './google';
import { invalidConfig, wrapSdkError } from './errors';

export interface GmailParams {
  recipient?: string;
  subject?: string;
  message?: string;
}

const EMAIL = /^[^\s@,<>"]+@[^\s@,<>"]+\.[^\s@,<>"]+$/;

/** Rejects CR/LF so values can't inject extra MIME headers. */
const headerSafe = (app: string, label: string, value: string): string => {
  if (/[\r\n]/.test(value)) throw invalidConfig(app, `${label} must not contain line breaks`);
  return value;
};

const buildRawMessage = (to: string[], subject: string, body: string): string => {
  const mime = [
    `To: ${to.join(', ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
  ].join('\r\n');
  return Buffer.from(mime).toString('base64url');
};

/** Sends an email as the connected Gmail user using their stored refresh token. */
export const sendGmail = async (userId: string, params: GmailParams) => {
  const creds = await getCredentials(userId, 'gmail');
  const auth = googleClientForRefreshToken('gmail', creds.refreshToken);

  const to = (params.recipient || '')
    .toString()
    .split(/[;,]/)
    .map((r) => r.trim())
    .filter(Boolean);
  if (to.length === 0) throw invalidConfig('gmail', 'At least one recipient is required');
  to.forEach((r) => {
    headerSafe('gmail', 'Recipient', r);
    if (!EMAIL.test(r)) throw invalidConfig('gmail', `"${r}" is not a valid email address`);
  });

  const subject = headerSafe('gmail', 'Subject', (params.subject || 'WorkSync Alert').toString());
  const body = (params.message || '').toString();
  if (!body.trim()) throw invalidConfig('gmail', 'Email body is required');

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.send(
      { userId: 'me', requestBody: { raw: buildRawMessage(to, subject, body) } },
      { retry: false } // retries belong to the worker
    );
    return {
      message: 'Gmail email sent successfully',
      data: { recipient: to.join(', '), subject, messageId: res.data.id, threadId: res.data.threadId },
    };
  } catch (err) {
    throw wrapSdkError('gmail', err);
  }
};
