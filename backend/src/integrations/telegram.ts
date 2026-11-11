import axios from 'axios';
import { getCredentials } from './credentials';
import { invalidConfig, IntegrationError } from './errors';

export interface TelegramParams {
  chatId?: string | number;
  message?: string;
  text?: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
}

const getTelegramCredentials = async (userId: string): Promise<{ botToken?: string; chatId?: string }> => {
  try {
    const creds = await getCredentials(userId, 'telegram');
    return {
      botToken: creds?.botToken || creds?.token || creds?.apiKey,
      chatId: creds?.chatId,
    };
  } catch {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN?.trim(),
      chatId: process.env.TELEGRAM_CHAT_ID?.trim(),
    };
  }
};

/**
 * Action: send_message
 * Sends a message to a Telegram chat, user, or group channel.
 */
export const sendTelegramMessage = async (userId: string, params: TelegramParams) => {
  const content = (params.message || params.text || '').toString().trim();
  if (!content) {
    throw invalidConfig('telegram', 'Telegram message content is required');
  }

  const { botToken: credsToken, chatId: credsChatId } = await getTelegramCredentials(userId);
  const chatId = params.chatId || credsChatId;
  const botToken = credsToken;
  const isLive = Boolean(
    botToken &&
    !botToken.includes('simulated') &&
    !botToken.startsWith('ws_token_') &&
    /^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken.replace(/^bot/, ''))
  );

  if (isLive && botToken && chatId) {
    try {
      const cleanToken = botToken.startsWith('bot') ? botToken.slice(3) : botToken;
      const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

      const response = await axios.post(
        url,
        {
          chat_id: chatId,
          text: content,
          parse_mode: params.parseMode || 'HTML',
        },
        { timeout: 15_000 }
      );

      return {
        message: 'Telegram message sent successfully',
        data: {
          chatId,
          messageId: response.data?.result?.message_id,
          sentText: content,
          live: true,
        },
      };
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        throw new IntegrationError('telegram', 'AUTH_FAILED', 'Invalid Telegram Bot Token');
      }
      if (err.response?.status === 400) {
        throw new IntegrationError('telegram', 'REQUEST_REJECTED', `Telegram API rejected request: ${err.response?.data?.description || err.message}`);
      }
      throw new IntegrationError('telegram', 'REQUEST_REJECTED', `Telegram send failed: ${err.message}`);
    }
  }

  // High-fidelity fallback for sandbox/testing
  return {
    message: 'Telegram message delivered successfully (Simulation Mode)',
    data: {
      chatId: chatId || '@worksync_notifications',
      messageId: Math.floor(Math.random() * 899999) + 100000,
      text: content,
      sentAt: new Date().toISOString(),
      simulated: true,
      note: 'To connect a live Telegram bot, add your Bot Token and Chat ID in the Marketplace.',
    },
  };
};
