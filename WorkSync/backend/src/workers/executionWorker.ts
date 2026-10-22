import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { ExecutionJobData } from '../queues/executionQueue';
import { ExecutionEngine } from '../services/executionEngine';
import { Workflow } from '../models/Workflow';
import { Execution } from '../models/Execution';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Worker that processes workflow execution jobs
 */
export const executionWorker = new Worker<ExecutionJobData>(
  'workflow-execution',
  async (job: Job<ExecutionJobData>) => {
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

      // Create a failed execution record if workflow was found
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
        });
      }

      throw error; // Re-throw to trigger BullMQ retry logic
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

executionWorker.on('error', (err: Error) => {
  console.error('[Worker] Worker error:', err);
});

export default executionWorker;
