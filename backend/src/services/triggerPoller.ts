import { Workflow } from '../models/Workflow';
import { POLLED_APPS, pollTrigger } from '../integrations/triggers';
import { enqueueWorkflowExecution } from '../queues/executionQueue';
import logger from '../utils/logger';

/**
 * One polling sweep: for every enabled workflow that watches an external app, fetch items newer
 * than its cursor and enqueue one execution per item. The cursor only advances after the items were
 * enqueued (and enqueueing is idempotent per item), so a crash can delay but never lose events.
 */
export const runTriggerPoll = async (): Promise<{ polled: number; enqueued: number; failed: number }> => {
  const workflows = await Workflow.find({ enabled: true, 'trigger.app': { $in: [...POLLED_APPS] } });
  let enqueued = 0;
  let failed = 0;

  for (const wf of workflows) {
    const id = wf._id.toString();
    try {
      const { events, state } = await pollTrigger(wf);
      for (const ev of events) {
        await enqueueWorkflowExecution(
          { workflowId: id, userId: wf.userId.toString(), customTriggerData: ev.data },
          { jobId: `evt-${id}-${ev.key}`.replace(/[^A-Za-z0-9_-]/g, '_') }
        );
        enqueued++;
      }
      await Workflow.updateOne(
        { _id: wf._id },
        { $set: { triggerState: { ...state, lastPolledAt: new Date().toISOString(), lastError: null } } }
      );
    } catch (err: any) {
      failed++;
      // IntegrationError messages are credential-free by design
      logger.warn({ workflowId: id, app: wf.trigger.app, error: err?.message }, 'Trigger poll failed');
      await Workflow.updateOne(
        { _id: wf._id },
        {
          $set: {
            triggerState: {
              ...(wf.triggerState || {}),
              lastPolledAt: new Date().toISOString(),
              lastError: err?.message || 'Polling failed',
            },
          },
        }
      );
    }
  }
  return { polled: workflows.length, enqueued, failed };
};
