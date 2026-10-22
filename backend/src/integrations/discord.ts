import { getCredentials } from './credentials';
import { assertHttpUrl, safeRequest } from './http';
import { invalidConfig } from './errors';

export const DISCORD_HOST = /^(?:(?:canary|ptb)\.)?discord(?:app)?\.com$/i;

export interface DiscordParams {
  message?: string;
}

/** Posts to a Discord webhook URL stored (encrypted) on the user's Discord integration. */
export const sendDiscordMessage = async (userId: string, params: DiscordParams) => {
  const { webhookUrl } = await getCredentials(userId, 'discord');
  const url = assertHttpUrl('discord', webhookUrl, { hosts: DISCORD_HOST, label: 'Discord webhook URL' });
  if (!url.pathname.startsWith('/api/webhooks/')) {
    throw invalidConfig('discord', 'Discord webhook URL is malformed');
  }

  const content = params.message?.toString().trim();
  if (!content) throw invalidConfig('discord', 'Discord message content is required');
  if (content.length > 2000) throw invalidConfig('discord', 'Discord messages are limited to 2000 characters');

  // Discord returns 204 No Content on success
  const res = await safeRequest('discord', { method: 'POST', url: url.toString(), data: { content } });
  return {
    message: 'Discord webhook message posted successfully',
    data: { content, status: res.status },
  };
};
