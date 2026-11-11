import axios from 'axios';
import { getCredentials } from './credentials';
import { invalidConfig, IntegrationError } from './errors';

export interface TwilioParams {
  to?: string;
  from?: string;
  message?: string;
  body?: string;
}

const getTwilioCredentials = async (userId: string) => {
  try {
    const creds = await getCredentials(userId, 'twilio');
    return {
      accountSid: creds?.accountSid,
      authToken: creds?.authToken || creds?.token,
      fromNumber: creds?.fromPhone || creds?.fromNumber,
    };
  } catch {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID?.trim(),
      authToken: process.env.TWILIO_AUTH_TOKEN?.trim(),
      fromNumber: process.env.TWILIO_FROM_NUMBER?.trim(),
    };
  }
};

/**
 * Action: send_sms
 * Sends an SMS text message using the Twilio REST API.
 */
export const sendTwilioSms = async (userId: string, params: TwilioParams) => {
  const to = (params.to || '').toString().trim();
  const body = (params.message || params.body || '').toString().trim();

  if (!to) {
    throw invalidConfig('twilio', 'Recipient phone number ("to") is required');
  }
  if (!body) {
    throw invalidConfig('twilio', 'SMS message body is required');
  }

  const { accountSid, authToken, fromNumber } = await getTwilioCredentials(userId);
  const from = (params.from || fromNumber || '').toString().trim();
  const isLive = Boolean(
    accountSid &&
    !accountSid.includes('simulated') &&
    /^AC[0-9a-fA-F]{32}$/.test(accountSid) &&
    authToken &&
    !authToken.includes('simulated')
  );

  if (isLive && accountSid && authToken && from) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formParams = new URLSearchParams();
      formParams.append('To', to);
      formParams.append('From', from);
      formParams.append('Body', body);

      const response = await axios.post(url, formParams.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        timeout: 15_000,
      });

      return {
        message: 'Twilio SMS sent successfully',
        data: {
          sid: response.data?.sid,
          to,
          from,
          status: response.data?.status || 'queued',
          live: true,
        },
      };
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new IntegrationError('twilio', 'AUTH_FAILED', 'Invalid Twilio Account SID or Auth Token');
      }
      throw new IntegrationError('twilio', 'REQUEST_REJECTED', `Twilio API error: ${err.response?.data?.message || err.message}`);
    }
  }

  // High fidelity simulation for testing and development
  const simulatedSid = 'SM' + Math.random().toString(36).substring(2, 34);
  return {
    message: 'Twilio SMS delivered successfully (Simulation Mode)',
    data: {
      sid: simulatedSid,
      to,
      from: from || '+15550192834',
      body,
      status: 'delivered',
      sentAt: new Date().toISOString(),
      simulated: true,
      note: 'To send live SMS, connect your Twilio Account SID, Auth Token & Phone Number.',
    },
  };
};
