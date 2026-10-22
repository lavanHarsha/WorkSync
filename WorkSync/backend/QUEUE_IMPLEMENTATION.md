# BullMQ Job Queue & Scheduler Implementation

## Overview
This implementation replaces synchronous workflow execution with a production-grade queue system using BullMQ and Redis. All workflows now execute asynchronously through a job queue with automatic retries, scheduling support, and status tracking.

## Architecture

### Components

1. **Queue** (`src/queues/executionQueue.ts`)
   - BullMQ queue named `workflow-execution`
   - Handles job enqueueing, scheduling, and status queries
   - Configured with exponential backoff (3 retries starting at 2s)
   - Job retention: 24h for completed, 7d for failed

2. **Worker** (`src/workers/executionWorker.ts`)
   - Processes jobs from the queue
   - Calls `ExecutionEngine.executeWorkflow()` 
   - Creates execution records with job tracking
   - Handles failures and retries automatically
   - Concurrency: 5 jobs, rate limit: 10/sec

3. **Scheduler Helper** (`src/services/schedulerHelper.ts`)
   - Converts schedule frequencies to cron patterns
   - Supports: hourly, daily, weekly, monthly

## API Changes

### Workflow Execution (202 Accepted)
**Before:** `POST /api/workflows/:id/test` returned completed execution (200)
**After:** Returns 202 Accepted with job tracking info

```json
{
  "success": true,
  "message": "Workflow execution queued",
  "jobId": "12345",
  "executionId": "67890",
  "statusUrl": "/api/executions/67890/status"
}
```

### Webhook Ingestion (202 Accepted)
**Before:** `POST /webhook/:webhookId` executed synchronously (200)
**After:** Returns 202 Accepted with job array

```json
{
  "success": true,
  "message": "Queued 1 workflow execution(s)",
  "jobs": [{
    "jobId": "12345",
    "executionId": "67890",
    "statusUrl": "/api/executions/67890/status"
  }]
}
```

### Status Polling
**NEW:** `GET /api/executions/:id/status`

Returns real-time execution status:
```json
{
  "success": true,
  "executionId": "67890",
  "status": "running",  // queued → running → success/failed
  "jobStatus": "active",
  "progress": 25,
  "startedAt": "2026-10-22T18:00:00.000Z",
  "completedAt": null,
  "duration": null,
  "error": null
}
```

## Execution Status Flow

1. **queued** - Job added to queue, waiting to be picked up
2. **running** - Worker is actively executing the workflow
3. **success** - Workflow completed successfully
4. **failed** - Workflow failed after all retry attempts

## Schedule Implementation

### Create/Update Workflow
When `trigger.app === 'schedule'` and workflow is enabled:
- Converts frequency to cron pattern
- Registers repeatable job in BullMQ
- Jobs fire automatically based on schedule

### Toggle Workflow
- **Enable:** Registers scheduled job if schedule trigger
- **Disable:** Removes scheduled job from queue

### Delete Workflow
- Automatically removes any scheduled jobs
- Cleans up all related execution history

### Cron Patterns
- `every_hour`: `0 * * * *` (top of every hour)
- `every_day`: `0 9 * * *` (9:00 AM daily)
- `every_week`: `0 9 * * 1` (9:00 AM every Monday)
- `every_month`: `0 9 1 * *` (9:00 AM first of month)

## Database Changes

### Execution Model
Added fields:
- `jobId` (string, indexed) - BullMQ job ID for tracking
- `isScheduled` (boolean) - Flag for schedule-triggered executions
- `status` enum extended: `'queued'` added alongside success/running/failed

## Environment Variables

Added to `.env.example`:
```
REDIS_URL=redis://localhost:6379
```

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install bullmq ioredis
   ```

2. **Start Redis:**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or locally
   redis-server
   ```

3. **Update .env:**
   ```
   REDIS_URL=redis://localhost:6379
   ```

4. **Start Server:**
   ```bash
   npm run dev
   ```
   Worker starts automatically with the server.

## Integration Notes

### ExecutionEngine Interface (Stable)
The `ExecutionEngine.executeWorkflow()` method signature remains unchanged:
```typescript
public static async executeWorkflow(
  workflow: IWorkflow,
  userId: string,
  options: ExecutionOptions = {}
): Promise<IExecution>
```

Agent C integrations continue working as-is. The only change is that HTTP handlers now enqueue jobs instead of calling ExecutionEngine directly.

### Monitoring

Worker logs to console:
- `[Worker] Processing job {jobId} for workflow {workflowId}`
- `[Worker] Job {jobId} completed successfully`
- `[Worker] Job {jobId} failed with error: {error}`

### Error Handling

BullMQ automatic retry on failure:
1. **Attempt 1:** Immediate
2. **Attempt 2:** After 2 seconds
3. **Attempt 3:** After 4 seconds (exponential backoff)
4. **Final:** Job marked failed, execution record created with error

## Testing

### Manual Test Flow
1. Create/update workflow with schedule trigger
2. Check Redis for repeatable job: `KEYS *schedule:*`
3. Trigger test execution: `POST /api/workflows/:id/test`
4. Poll status: `GET /api/executions/:id/status`
5. Verify execution completed in database

### Webhook Test
```bash
curl -X POST http://localhost:5000/webhook/wh_test123 \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Expected: 202 response with job tracking info

## Files Modified

### New Files
- `backend/src/queues/executionQueue.ts`
- `backend/src/workers/executionWorker.ts`
- `backend/src/services/schedulerHelper.ts`
- `backend/.env.example` (updated)

### Modified Files
- `backend/src/controllers/workflowController.ts` - Added queue calls, schedule management
- `backend/src/controllers/executionController.ts` - Added status endpoint
- `backend/src/routes/executionRoutes.ts` - Added status route
- `backend/src/models/Execution.ts` - Added jobId, isScheduled fields
- `backend/src/types/index.ts` - Added 'queued' status
- `backend/src/server.ts` - Import worker, expose REDIS_URL
- `backend/package.json` - Added bullmq, ioredis dependencies

## Production Considerations

1. **Redis Persistence:** Configure Redis with AOF or RDB for job durability
2. **Worker Scaling:** Run multiple worker processes for higher throughput
3. **Monitoring:** Use BullMQ Board or custom dashboards
4. **Job Retention:** Adjust retention policies based on audit requirements
5. **Error Alerts:** Hook into worker error events for monitoring
