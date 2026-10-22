import { getCredentials } from './credentials';
import { assertHttpUrl, safeRequest } from './http';
import { invalidConfig } from './errors';

export const SLACK_HOST = /^hooks\.slack\.com$/i;

export interface SlackParams {
  message?: string;
  channel?: string;
}

/** Posts to a Slack Incoming Webhook URL stored (encrypted) on the user's Slack integration. */
export const sendSlackMessage = async (userId: string, params: SlackParams) => {
  const { webhookUrl } = await getCredentials(userId, 'slack');
  const url = assertHttpUrl('slack', webhookUrl, { hosts: SLACK_HOST, label: 'Slack webhook URL' });

  const text = params.message?.toString().trim();
  if (!text) throw invalidConfig('slack', 'Slack message text is required');

  // Incoming webhooks are bound to one channel; channel override only works on legacy webhooks
  const body: Record<string, any> = { text };
  if (params.channel) body.channel = params.channel;

  const res = await safeRequest('slack', { method: 'POST', url: url.toString(), data: body });
  return {
    message: 'Slack notification sent successfully',
    data: { channel: params.channel, text, status: res.status, response: String(res.data).slice(0, 100) },
  };
};
