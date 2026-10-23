import { Request, Response, NextFunction } from 'express';
import { Workflow } from '../models/Workflow';
import { Execution } from '../models/Execution';
import { AuthRequest } from '../middleware/auth';
import { enqueueWorkflowExecution, scheduleRepeatableJob, removeScheduledJob } from '../queues/executionQueue';
import { scheduleFrequencyToCron } from '../services/schedulerHelper';
import { hmacSha256Hex, safeEqual } from '../utils/crypto';

const SIGNATURE_HEADER = 'x-worksync-signature';

export const getWorkflows = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { status, search, sort } = req.query;

    const query: any = { userId };

    if (status === 'active') {
      query.enabled = true;
    } else if (status === 'inactive') {
      query.enabled = false;
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'trigger.app': { $regex: search, $options: 'i' } },
        { 'action.app': { $regex: search, $options: 'i' } },
      ];
    }

    let sortOptions: any = { createdAt: -1 };
    if (sort === 'lastExecuted') {
      sortOptions = { lastExecutedAt: -1 };
    } else if (sort === 'name') {
      sortOptions = { name: 1 };
    } else if (sort === 'executions') {
      sortOptions = { executionCount: -1 };
    }

    const workflows = await Workflow.find(query).sort(sortOptions);

    res.status(200).json({
      success: true,
      count: workflows.length,
      workflows,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkflowById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    // Select the secret so owners can retrieve it; saving backfills it for legacy webhook workflows
    const workflow = await Workflow.findOne({ _id: req.params.id, userId }).select('+webhookSecret');

    if (!workflow) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    if (workflow.trigger?.app === 'webhook' && !workflow.webhookSecret) {
      await workflow.save(); // pre-save hook generates the secret
    }

    res.status(200).json({
      success: true,
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

export const createWorkflow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, description, trigger, action, conditions, enabled } = req.body;

    if (!name || !trigger || !action) {
      res.status(400).json({
        success: false,
        message: 'Workflow name, trigger configuration, and action configuration are required',
      });
      return;
    }

    if (!trigger.app || !trigger.event) {
      res.status(400).json({ success: false, message: 'Trigger must specify an app and an event' });
      return;
    }

    if (!action.app || !action.action) {
      res.status(400).json({ success: false, message: 'Action must specify an app and an action type' });
      return;
    }

    // Generate unique webhook identifier if trigger is webhook
    let webhookId = trigger.webhookId;
    if (trigger.app === 'webhook' && !webhookId) {
      webhookId = 'wh_' + Math.random().toString(36).substring(2, 14);
      trigger.webhookId = webhookId;
    }

    const workflow = await Workflow.create({
      userId,
      name,
      description: description || '',
      trigger,
      action,
      conditions: conditions || [],
      enabled: enabled !== undefined ? enabled : true,
    });

    // Schedule repeatable job if trigger is schedule and enabled
    if (trigger.app === 'schedule' && workflow.enabled && trigger.parameters?.frequency) {
      const cronPattern = scheduleFrequencyToCron(trigger.parameters.frequency);
      await scheduleRepeatableJob(workflow._id.toString(), userId as string, cronPattern);
    }

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkflow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, description, trigger, action, conditions, enabled } = req.body;

    const workflow = await Workflow.findOne({ _id: req.params.id, userId }).select('+webhookSecret');
    if (!workflow) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    const oldTriggerApp = workflow.trigger.app;
    const oldFrequency = workflow.trigger.parameters?.frequency;
    const wasEnabled = workflow.enabled;

    if (name) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (trigger) {
      if (trigger.app === 'webhook' && !trigger.webhookId && !workflow.trigger.webhookId) {
        trigger.webhookId = 'wh_' + Math.random().toString(36).substring(2, 14);
      }
      workflow.trigger = trigger;
    }
    if (action) workflow.action = action;
    if (conditions !== undefined) workflow.conditions = conditions;
    if (enabled !== undefined) workflow.enabled = enabled;

    await workflow.save();

    // Handle schedule changes
    const newTriggerApp = workflow.trigger.app;
    const newFrequency = workflow.trigger.parameters?.frequency;
    const isEnabled = workflow.enabled;

    // If schedule config changed or enabled status changed, update the repeatable job
    if (newTriggerApp === 'schedule') {
      if (!isEnabled || (oldTriggerApp === 'schedule' && oldFrequency !== newFrequency)) {
        // Remove old schedule
        await removeScheduledJob(workflow._id.toString());
      }

      if (isEnabled && newFrequency) {
        // Add new schedule
        const cronPattern = scheduleFrequencyToCron(newFrequency);
        await scheduleRepeatableJob(workflow._id.toString(), userId as string, cronPattern);
      }
    } else if (oldTriggerApp === 'schedule') {
      // Switched away from schedule trigger, remove the job
      await removeScheduledJob(workflow._id.toString());
    }

    res.status(200).json({
      success: true,
      message: 'Workflow updated successfully',
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkflow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workflow = await Workflow.findOneAndDelete({ _id: req.params.id, userId });

    if (!workflow) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    // Remove scheduled job if it's a schedule trigger
    if (workflow.trigger.app === 'schedule') {
      await removeScheduledJob(workflow._id.toString());
    }

    // Delete associated executions
    await Execution.deleteMany({ workflowId: workflow._id });

    res.status(200).json({
      success: true,
      message: 'Workflow and associated execution history deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleWorkflow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workflow = await Workflow.findOne({ _id: req.params.id, userId });

    if (!workflow) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    workflow.enabled = !workflow.enabled;
    await workflow.save();

    // Handle schedule trigger toggle
    if (workflow.trigger.app === 'schedule' && workflow.trigger.parameters?.frequency) {
      if (workflow.enabled) {
        // Enable: add repeatable job
        const cronPattern = scheduleFrequencyToCron(workflow.trigger.parameters.frequency);
        await scheduleRepeatableJob(workflow._id.toString(), userId as string, cronPattern);
      } else {
        // Disable: remove repeatable job
        await removeScheduledJob(workflow._id.toString());
      }
    }

    res.status(200).json({
      success: true,
      message: `Workflow ${workflow.enabled ? 'activated' : 'paused'} successfully`,
      enabled: workflow.enabled,
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateWorkflow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const original = await Workflow.findOne({ _id: req.params.id, userId });

    if (!original) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    const cloned = await Workflow.create({
      userId,
      name: `${original.name} (Copy)`,
      description: original.description,
      trigger: {
        ...original.trigger,
        webhookId: original.trigger.app === 'webhook'
          ? 'wh_' + Math.random().toString(36).substring(2, 14)
          : undefined,
      },
      action: original.action,
      conditions: original.conditions,
      enabled: false, // Start paused
      executionCount: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Workflow duplicated successfully',
      workflow: cloned,
    });
  } catch (error) {
    next(error);
  }
};

export const testWorkflow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id as string;
    const workflow = await Workflow.findOne({ _id: req.params.id, userId });

    if (!workflow) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    const customTriggerData = req.body?.triggerData;

    // Enqueue the execution instead of running synchronously
    const { jobId, executionId } = await enqueueWorkflowExecution({
      workflowId: workflow._id.toString(),
      userId,
      customTriggerData,
    });

    res.status(202).json({
      success: true,
      message: 'Workflow execution queued',
      jobId,
      executionId,
      statusUrl: `/api/executions/${executionId}/status`,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkflowHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const executions = await Execution.find({ workflowId: req.params.id, userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: executions.length,
      executions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public Webhook Ingestion Endpoint
 * Trigger workflows dynamically from external systems!
 */
export const handleIncomingWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { webhookId } = req.params;
    const candidates = await Workflow.find({
      'trigger.webhookId': webhookId,
      enabled: true,
    }).select('+webhookSecret');

    if (!candidates || candidates.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No active workflow found matching webhook ID',
      });
      return;
    }

    // Verify HMAC-SHA256 of the raw request body against each workflow's secret
    const header = req.headers[SIGNATURE_HEADER];
    const provided = (Array.isArray(header) ? header[0] : header)?.replace(/^sha256=/i, '').trim();
    const rawBody: Buffer | string = (req as any).rawBody ?? '';

    const workflows = provided
      ? candidates.filter(
        (wf) => !!wf.webhookSecret && safeEqual(provided.toLowerCase(), hmacSha256Hex(wf.webhookSecret, rawBody))
      )
      : [];

    if (workflows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Missing or invalid X-WorkSync-Signature',
      });
      return;
    }

    const results = [];
    for (const wf of workflows) {
      const job = await enqueueWorkflowExecution({
        workflowId: wf._id.toString(),
        userId: wf.userId.toString(),
        customTriggerData: req.body,
        isLiveWebhook: true,
      });
      results.push(job);
    }

    res.status(202).json({
      success: true,
      message: `Queued ${results.length} workflow execution(s)`,
      jobs: results.map(j => ({
        jobId: j.jobId,
        executionId: j.executionId,
        statusUrl: `/api/executions/${j.executionId}/status`,
      })),
    });
  } catch (error) {
    next(error);
  }
};
