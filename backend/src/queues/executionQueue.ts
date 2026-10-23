import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger';

/** Creates a BullMQ-compatible Redis connection whose errors are logged once instead of spamming stderr. */
export const createRedisConnection = (label: string): Redis => {
  const conn = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 1000, 15000),
  });
  let lastLogged = 0;
  conn.on('error', (err: Error) => {
    const now = Date.now();
    if (now - lastLogged > 30_000) {
      lastLogged = now;
      logger.error({ redis: label, error: err.message || String((err as any).code) }, 'Redis connection error');
    }
  });
  conn.on('ready', () => logger.info({ redis: label }, 'Redis connection ready'));
  return conn;
};

const redisConnection = createRedisConnection('queue');

export const getRedis = (): Redis => redisConnection;

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
    { pattern: cronPattern, tz: 'UTC' },
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

/** How often external-app triggers (Gmail, Sheets, Forms, GitHub, Notion) are polled. */
export const TRIGGER_POLL_INTERVAL_MS = Number(process.env.TRIGGER_POLL_INTERVAL_MS) || 60_000;

/** Registers the single recurring job that drives every polling trigger. Safe to call on every boot. */
export const registerTriggerPoller = async () => {
  await executionQueue.upsertJobScheduler(
    'trigger-poller',
    { every: TRIGGER_POLL_INTERVAL_MS },
    {
      name: 'poll-triggers',
      data: { workflowId: '', userId: '' },
      opts: { attempts: 1, removeOnComplete: true, removeOnFail: 50 },
    }
  );
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
