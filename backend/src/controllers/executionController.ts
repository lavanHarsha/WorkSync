import { Response, NextFunction } from 'express';
import { Execution } from '../models/Execution';
import { AuthRequest } from '../middleware/auth';
import { getJobStatus } from '../queues/executionQueue';

export const getExecutions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { status, workflowId, limit = 50, page = 1 } = req.query;

    const query: any = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (workflowId) {
      query.workflowId = workflowId;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const total = await Execution.countDocuments(query);
    const executions = await Execution.find(query)
      .populate('workflowId', 'name trigger action enabled')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      executions,
    });
  } catch (error) {
    next(error);
  }
};

export const getExecutionById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const execution = await Execution.findOne({ _id: req.params.id, userId })
      .populate('workflowId', 'name trigger action description enabled');

    if (!execution) {
      res.status(404).json({ success: false, message: 'Execution record not found' });
      return;
    }

    // If execution has a jobId, also fetch job status from queue
    let jobStatus = null;
    if (execution.jobId) {
      jobStatus = await getJobStatus(execution.jobId);
    }

    res.status(200).json({
      success: true,
      execution,
      jobStatus,
    });
  } catch (error) {
    next(error);
  }
};

export const clearHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    await Execution.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: 'Execution history cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getExecutionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // First check if execution exists and belongs to user
    const execution = await Execution.findOne({ _id: id, userId });

    if (!execution) {
      res.status(404).json({ success: false, message: 'Execution not found' });
      return;
    }

    // Get job status if jobId exists
    let jobStatus = null;
    if (execution.jobId) {
      jobStatus = await getJobStatus(execution.jobId);
    }

    // Map queue status to execution status
    let currentStatus = execution.status;
    if (jobStatus) {
      switch (jobStatus.status) {
        case 'waiting':
        case 'delayed':
          currentStatus = 'queued';
          break;
        case 'active':
          currentStatus = 'running';
          break;
        case 'completed':
          currentStatus = 'success';
          break;
        case 'failed':
          currentStatus = 'failed';
          break;
      }
    }

    res.status(200).json({
      success: true,
      executionId: execution._id,
      status: currentStatus,
      jobStatus: jobStatus?.status,
      progress: jobStatus?.progress,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration,
      error: execution.error || jobStatus?.failedReason,
    });
  } catch (error) {
    next(error);
  }
};
