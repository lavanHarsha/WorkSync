import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateOpenAIText, summarizeOpenAIText, analyzeOpenAISentiment } from './openai';
import { sendTelegramMessage } from './telegram';
import { createAirtableRecord } from './airtable';
import { sendTwilioSms } from './twilio';
import { createStripeCustomer } from './stripe';
import { executeIntegrationAction } from './index';

describe('New Integrations Suite', () => {
  const mockUserId = '64e8b3f2c9a1d4e7f8b9c0d1';

  describe('OpenAI Integration', () => {
    it('generates text with simulated fallback when no key is set', async () => {
      const res = await generateOpenAIText(mockUserId, {
        prompt: 'Write a welcome email for new WorkSync signups',
      });
      expect(res.message).toContain('OpenAI');
      expect(res.data.generatedText).toBeTruthy();
      expect(res.data.simulated).toBe(true);
    });

    it('summarizes input text', async () => {
      const res = await summarizeOpenAIText(mockUserId, {
        text: 'The customer reported that they were unable to connect their Google Sheet. They were getting a 404 error during redirect.',
      });
      expect(res.data.generatedText).toBeTruthy();
    });

    it('analyzes sentiment accurately', async () => {
      const positiveRes = await analyzeOpenAISentiment(mockUserId, {
        text: 'I love this product! It is super fast and awesome!',
      });
      expect(positiveRes.data.sentiment).toBe('positive');

      const negativeRes = await analyzeOpenAISentiment(mockUserId, {
        text: 'The workflow is completely broken, throws terrible bugs and errors.',
      });
      expect(negativeRes.data.sentiment).toBe('negative');
    });
  });

  describe('Telegram Integration', () => {
    it('dispatches telegram message successfully in simulation mode', async () => {
      const res = await sendTelegramMessage(mockUserId, {
        chatId: '@worksync_notifications',
        message: 'Sprint milestone achieved!',
      });
      expect(res.message).toContain('Telegram');
      expect(res.data.chatId).toBe('@worksync_notifications');
      expect(res.data.simulated).toBe(true);
    });
  });

  describe('Airtable Integration', () => {
    it('creates a record in Airtable table in simulation mode', async () => {
      const res = await createAirtableRecord(mockUserId, {
        baseId: 'app_test_123',
        tableName: 'Submissions',
        fields: {
          Name: 'Taylor Swift',
          Email: 'taylor@swift.io',
        },
      });
      expect(res.message).toContain('Airtable');
      expect(res.data.id).toMatch(/^rec/);
      expect(res.data.fields.Name).toBe('Taylor Swift');
    });
  });

  describe('Twilio Integration', () => {
    it('sends SMS successfully in simulation mode', async () => {
      const res = await sendTwilioSms(mockUserId, {
        to: '+1234567890',
        message: 'Your verification code is 482910',
      });
      expect(res.message).toContain('Twilio');
      expect(res.data.to).toBe('+1234567890');
      expect(res.data.sid).toMatch(/^SM/);
    });
  });

  describe('Stripe Integration', () => {
    it('creates customer successfully in simulation mode', async () => {
      const res = await createStripeCustomer(mockUserId, {
        name: 'Jordan Lee',
        email: 'jordan@example.com',
      });
      expect(res.message).toContain('Stripe');
      expect(res.data.id).toMatch(/^cus_/);
      expect(res.data.email).toBe('jordan@example.com');
    });
  });

  describe('Integration Action Dispatcher', () => {
    it('dispatches to all new handlers via executeIntegrationAction', async () => {
      const openaiResult = await executeIntegrationAction('openai', 'generate_text', mockUserId, {
        prompt: 'Hello AI',
      });
      expect(openaiResult.data.generatedText).toBeTruthy();

      const telegramResult = await executeIntegrationAction('telegram', 'send_message', mockUserId, {
        message: 'Hello Telegram',
      });
      expect(telegramResult.data.text).toBe('Hello Telegram');

      const airtableResult = await executeIntegrationAction('airtable', 'create_record', mockUserId, {
        baseId: 'app_sample',
        tableName: 'Contacts',
      });
      expect(airtableResult.data.id).toBeTruthy();

      const twilioResult = await executeIntegrationAction('twilio', 'send_sms', mockUserId, {
        to: '+15555555555',
        message: 'Hello SMS',
      });
      expect(twilioResult.data.sid).toBeTruthy();

      const stripeResult = await executeIntegrationAction('stripe', 'create_customer', mockUserId, {
        name: 'Alex Doe',
        email: 'alex@example.com',
      });
      expect(stripeResult.data.id).toBeTruthy();
    });
  });
});
