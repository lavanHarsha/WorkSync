import { z } from 'zod';

const appIdParams = z.object({ appId: z.string().regex(/^[a-z_]{2,40}$/, 'Invalid app id') });

export const connectAppSchema = {
  params: appIdParams,
  body: z.object({
    authData: z.record(z.string(), z.any()).optional(),
  }).default({}),
};

export const disconnectAppSchema = {
  params: appIdParams,
};
