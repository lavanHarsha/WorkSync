import { Worker, Job, UnrecoverableError } from 'bullmq';
import { ExecutionJobData, createRedisConnection } from '../queues/executionQueue';
import { ExecutionEngine } from '../services/executionEngine';
import { Workflow } from '../models/Workflow';
import { Execution } from '../models/Execution';
import { IntegrationError } from '../integrations/errors';
import { runTriggerPoll } from '../services/triggerPoller';
import logger from '../utils/logger';

const redisConnection = createRedisConnection('worker');

/**
 * Worker that processes workflow execution jobs
 */
export const executionWorker = new Worker<ExecutionJobData>(
  'workflow-execution',
  async (job: Job<ExecutionJobData>) => {
    // Recurring sweep that watches Gmail/Sheets/Forms/GitHub/Notion for new items
    if (job.name === 'poll-triggers') {
      const result = await runTriggerPoll();
      if (result.polled > 0) logger.info(result, 'Trigger poll sweep finished');
      return result;
    }

    const { workflowId, userId, customTriggerData, isLiveWebhook, isScheduled } = job.data;

    console.log(`[Worker] Processing job ${job.id} for workflow ${workflowId}`);

    try {
      // Fetch the workflow
      const workflow = await Workflow.findById(workflowId);

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Check if workflow is enabled
      if (!workflow.enabled) {
        console.log(`[Worker] Workflow ${workflowId} is disabled, skipping execution`);
        return {
          skipped: true,
          reason: 'Workflow is disabled',
        };
      }

      // Update job progress
      await job.updateProgress(25);

      // Execute the workflow using ExecutionEngine
      const execution = await ExecutionEngine.executeWorkflow(workflow, userId, {
        customTriggerData,
        isLiveWebhook,
      });

      await job.updateProgress(75);

      // Update the execution document with job metadata
      await Execution.findByIdAndUpdate(execution._id, {
        $set: {
          jobId: job.id as string,
          isScheduled: isScheduled || false,
        },
      });

      await job.updateProgress(100);

      console.log(
        `[Worker] Job ${job.id} completed successfully. Execution ${execution._id} status: ${execution.status}`
      );

      return {
        executionId: execution._id.toString(),
        status: execution.status,
        duration: execution.duration,
      };
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);

      // Check if executeWorkflow already created an Execution record for this run
      const latestExecution = await Execution.findOne({
        workflowId,
        userId,
        status: 'failed',
      }).sort({ createdAt: -1 });

      if (latestExecution && !latestExecution.jobId) {
        await Execution.findByIdAndUpdate(latestExecution._id, {
          $set: {
            jobId: job.id as string,
            isScheduled: isScheduled || false,
          },
        });
      } else if (!latestExecution) {
        // Fallback: Create a failed execution record if workflow was found but no execution was logged
        const workflow = await Workflow.findById(workflowId);
        if (workflow) {
          await Execution.create({
            workflowId: workflow._id,
            userId,
            triggerData: customTriggerData || {},
            actionData: {},
            status: 'failed',
            error: error.message,
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0,
            logs: [
              {
                step: 'error',
                title: 'Job processing failed',
                status: 'failed',
                message: error.message,
                timestamp: new Date(),
              },
            ],
            jobId: job.id as string,
            isScheduled: isScheduled || false,
          });
        }
      }

      // Check if this is a non-retryable integration error
      const isNonRetryable =
        (error instanceof IntegrationError && !error.retryable) ||
        (error?.name === 'IntegrationError' && error?.retryable === false);

      if (isNonRetryable) {
        console.log(
          `[Worker] Job ${job.id} failed with non-retryable IntegrationError (${error.code || error.message}). Failing immediately without retry.`
        );
        if (typeof (job as any).discard === 'function') {
          (job as any).discard();
        }
        const unrecoverable = new UnrecoverableError(error.message);
        unrecoverable.cause = error;
        (unrecoverable as any).app = error.app;
        (unrecoverable as any).code = error.code;
        (unrecoverable as any).statusCode = error.statusCode;
        (unrecoverable as any).retryable = false;
        throw unrecoverable;
      }

      throw error; // Re-throw retryable error to trigger BullMQ exponential backoff
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Event listeners for monitoring
executionWorker.on('completed', (job: Job) => {
  console.log(`[Worker] Job ${job.id} has been completed`);
});

executionWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} has failed with error:`, err.message);
});

let lastWorkerErrorLog = 0;
executionWorker.on('error', (err: Error) => {
  const now = Date.now();
  if (now - lastWorkerErrorLog > 30_000) {
    lastWorkerErrorLog = now;
    logger.warn({ error: err.message }, '[Worker] Worker connection error (retrying)');
  }
});

export default executionWorker;
