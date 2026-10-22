import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export interface ExecutionJobData {
  workflowId: string;
  userId: string;
  customTriggerData?: Record<string, any>;
  isLiveWebhook?: boolean;
  isScheduled?: boolean;
}

export const executionQueue = new Queue<ExecutionJobData>('workflow-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s, doubles each retry
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Add a workflow execution job to the queue
 */
export const enqueueWorkflowExecution = async (
  data: ExecutionJobData,
  options?: { jobId?: string; delay?: number }
) => {
  const job = await executionQueue.add('execute-workflow', data, {
    jobId: options?.jobId,
    delay: options?.delay,
  });

  return {
    jobId: job.id,
    executionId: job.id, // Use job ID as execution ID for tracking
  };
};

/**
 * Schedule a repeatable job for cron-based workflows
 */
export const scheduleRepeatableJob = async (
  workflowId: string,
  userId: string,
  cronPattern: string
) => {
  const jobId = `schedule:${workflowId}`;

  await executionQueue.upsertJobScheduler(
    jobId,
    { pattern: cronPattern },
    {
      name: 'execute-workflow',
      data: {
        workflowId,
        userId,
        isScheduled: true,
      },
    }
  );

  return { jobId };
};

/**
 * Remove a scheduled repeatable job
 */
export const removeScheduledJob = async (workflowId: string) => {
  const jobId = `schedule:${workflowId}`;
  await executionQueue.removeJobScheduler(jobId);
};

/**
 * Get job status for polling
 */
export const getJobStatus = async (jobId: string) => {
  const job = await executionQueue.getJob(jobId);

  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    status: state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
};

export default executionQueue;
