import { z } from 'zod';
import { objectId } from './workflowValidators';

export const getExecutionsSchema = {
  query: z.object({
    status: z.enum(['all', 'success', 'running', 'failed']).optional(),
    workflowId: objectId.optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

export const getExecutionByIdSchema = {
  params: z.object({ id: objectId }),
};
