import { Response, NextFunction } from 'express';
import { Workflow } from '../models/Workflow';
import { Execution } from '../models/Execution';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Workflow counts
    const totalWorkflows = await Workflow.countDocuments({ userId });
    const activeWorkflows = await Workflow.countDocuments({ userId, enabled: true });
    const inactiveWorkflows = totalWorkflows - activeWorkflows;

    // Execution counts
    const totalExecutions = await Execution.countDocuments({ userId });
    const successfulExecutions = await Execution.countDocuments({ userId, status: 'success' });
    const failedExecutions = await Execution.countDocuments({ userId, status: 'failed' });

    // Recent workflows
    const recentWorkflows = await Workflow.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5);

    // Recent executions
    const recentExecutions = await Execution.find({ userId })
      .populate('workflowId', 'name trigger action')
      .sort({ startedAt: -1 })
      .limit(6);

    // Activity over last 7 days for the chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const executionsLast7Days = await Execution.find({
      userId,
      startedAt: { $gte: sevenDaysAgo },
    });

    // Group by day format 'YYYY-MM-DD'
    const daysMap: Record<string, { date: string; day: string; success: number; failed: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      daysMap[key] = { date: key, day: dayName, success: 0, failed: 0, total: 0 };
    }

    executionsLast7Days.forEach((exec) => {
      const key = new Date(exec.startedAt).toISOString().split('T')[0];
      if (daysMap[key]) {
        daysMap[key].total += 1;
        if (exec.status === 'success') daysMap[key].success += 1;
        if (exec.status === 'failed') daysMap[key].failed += 1;
      }
    });

    const activityChart = Object.values(daysMap);

    // Success rate percentage
    const successRate = totalExecutions > 0 
      ? Math.round((successfulExecutions / totalExecutions) * 100) 
      : 100;

    res.status(200).json({
      success: true,
      stats: {
        totalWorkflows,
        activeWorkflows,
        inactiveWorkflows,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
      },
      recentWorkflows,
      recentExecutions,
      activityChart,
    });
  } catch (error) {
    next(error);
  }
};
