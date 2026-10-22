import { z } from 'zod';

export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const idParams = { params: z.object({ id: objectId }) };

const params = z.record(z.string(), z.any());

const triggerSchema = z.object({
  app: z.enum(['gmail', 'google_sheets', 'google_forms', 'slack', 'webhook', 'schedule', 'notion', 'discord', 'github']),
  event: z.string().trim().min(1).max(100),
  parameters: params.optional().default({}),
  webhookId: z.string().regex(/^wh_[a-z0-9]{6,32}$/).optional(),
});

const actionSchema = z.object({
  app: z.enum(['slack', 'gmail', 'google_sheets', 'discord', 'teams', 'webhook', 'notion']),
  action: z.string().trim().min(1).max(100),
  parameters: params.optional().default({}),
});

const conditionSchema = z.object({
  field: z.string().max(200).optional(),
  operator: z.enum(['equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'exists']).optional(),
  value: z.string().max(1000).optional(),
});

export const createWorkflowSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Workflow name is required').max(200),
    description: z.string().max(2000).optional(),
    trigger: triggerSchema,
    action: actionSchema,
    conditions: z.array(conditionSchema).max(50).optional(),
    enabled: z.boolean().optional(),
  }),
};

export const updateWorkflowSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    trigger: triggerSchema.optional(),
    action: actionSchema.optional(),
    conditions: z.array(conditionSchema).max(50).optional(),
    enabled: z.boolean().optional(),
  }),
};

export const getWorkflowsSchema = {
  query: z.object({
    status: z.enum(['active', 'inactive', 'all']).optional(),
    search: z.string().max(200).optional(),
    sort: z.enum(['lastExecuted', 'name', 'executions']).optional(),
  }),
};

export const testWorkflowSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    triggerData: z.record(z.string(), z.any()).optional(),
  }).default({}),
};

export const webhookSchema = {
  params: z.object({ webhookId: z.string().regex(/^[A-Za-z0-9_-]{3,64}$/, 'Invalid webhook id') }),
  // Webhook payloads are arbitrary JSON objects; only the shape is enforced.
  body: z.record(z.string(), z.any()).default({}),
};
