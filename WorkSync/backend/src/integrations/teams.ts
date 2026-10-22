import { getCredentials } from './credentials';
import { assertHttpUrl, safeRequest } from './http';
import { invalidConfig } from './errors';

// Office 365 connectors, the newer Power Automate / Workflows webhooks, and legacy outlook.office.com
export const TEAMS_HOST = /(?:\.webhook\.office\.com|^outlook\.office3?6?5?\.com|\.logic\.azure\.com|\.powerplatform\.com|\.api\.powerplatform\.com)$/i;

export interface TeamsParams {
  message?: string;
  title?: string;
}

/** Posts to a Microsoft Teams Incoming Webhook URL stored (encrypted) on the user's Teams integration. */
export const sendTeamsMessage = async (userId: string, params: TeamsParams) => {
  const { webhookUrl } = await getCredentials(userId, 'teams');
  const url = assertHttpUrl('teams', webhookUrl, { hosts: TEAMS_HOST, label: 'Teams webhook URL' });

  const text = params.message?.toString().trim();
  if (!text) throw invalidConfig('teams', 'Teams message text is required');

  const body: Record<string, any> = { text };
  if (params.title) body.title = params.title;

  // Legacy connectors answer 200 with body "1"; failures can still be 200 with an error string
  const res = await safeRequest('teams', { method: 'POST', url: url.toString(), data: body });
  if (typeof res.data === 'string' && /^(?:error|webhook)/i.test(res.data.trim())) {
    throw invalidConfig('teams', `Teams webhook rejected the message: ${res.data.slice(0, 120)}`);
  }
  return {
    message: 'Microsoft Teams message posted successfully',
    data: { text, status: res.status },
  };
};
