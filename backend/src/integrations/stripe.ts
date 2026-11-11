import axios from 'axios';
import { getCredentials } from './credentials';
import { invalidConfig, IntegrationError } from './errors';

export interface StripeParams {
  email?: string;
  name?: string;
  description?: string;
  phone?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

const getStripeKey = async (userId: string): Promise<string | null> => {
  try {
    const creds = await getCredentials(userId, 'stripe');
    return creds?.apiKey || creds?.secretKey || null;
  } catch {
    return process.env.STRIPE_SECRET_KEY?.trim() || null;
  }
};

/**
 * Action: create_customer
 * Creates a new customer account in Stripe.
 */
export const createStripeCustomer = async (userId: string, params: StripeParams) => {
  const email = (params.email || '').toString().trim();
  const name = (params.name || '').toString().trim();

  if (!email && !name) {
    throw invalidConfig('stripe', 'At least an email or name is required to create a Stripe customer');
  }

  const apiKey = await getStripeKey(userId);
  const isLive = Boolean(
    apiKey &&
    !apiKey.includes('simulated') &&
    !apiKey.startsWith('ws_token_') &&
    /^sk_(live|test)_[a-zA-Z0-9]{14,}$/.test(apiKey)
  );

  if (isLive && apiKey) {
    try {
      const formParams = new URLSearchParams();
      if (email) formParams.append('email', email);
      if (name) formParams.append('name', name);
      if (params.description) formParams.append('description', params.description);
      if (params.phone) formParams.append('phone', params.phone);

      const response = await axios.post('https://api.stripe.com/v1/customers', formParams.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15_000,
      });

      return {
        message: 'Stripe customer created successfully',
        data: {
          id: response.data?.id,
          email: response.data?.email,
          name: response.data?.name,
          currency: response.data?.currency,
          live: true,
        },
      };
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new IntegrationError('stripe', 'AUTH_FAILED', 'Invalid Stripe Secret Key');
      }
      throw new IntegrationError('stripe', 'REQUEST_REJECTED', `Stripe error: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  // Realistic simulation for testing and demo flows
  const simulatedId = 'cus_' + Math.random().toString(36).substring(2, 16);
  return {
    message: 'Stripe customer created successfully (Simulation Mode)',
    data: {
      id: simulatedId,
      email: email || 'alex.customer@example.com',
      name: name || 'Alex Customer',
      created: Math.floor(Date.now() / 1000),
      simulated: true,
      note: 'To create live Stripe customers, add your Stripe Secret Key (sk_test_...) in the Marketplace.',
    },
  };
};
