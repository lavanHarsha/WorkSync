import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IWorkflow, IExecution, IDashboardStats, IActivityChartPoint } from '../types';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge } from '../components/StatusBadge';
import { ExecutionTestModal } from '../components/ExecutionTestModal';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Activity,
  Plus,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<IWorkflow[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<IExecution[]>([]);
  const [activityChart, setActivityChart] = useState<IActivityChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workflow test modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedWorkflowForTest, setSelectedWorkflowForTest] = useState<IWorkflow | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDashboardStats();
      if (data.success) {
        setStats(data.stats);
        setRecentWorkflows(data.recentWorkflows);
        setRecentExecutions(data.recentExecutions);
        setActivityChart(data.activityChart);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleWorkflow = async (workflow: IWorkflow, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const id = workflow._id || (workflow as any).id;
      const res = await api.toggleWorkflow(id);
      if (res.success) {
        setRecentWorkflows((prev) =>
          prev.map((w) => (w._id === id || (w as any).id === id ? { ...w, enabled: res.enabled } : w))
        );
        if (stats) {
          setStats({
            ...stats,
            activeWorkflows: res.enabled ? stats.activeWorkflows + 1 : stats.activeWorkflows - 1,
            inactiveWorkflows: res.enabled ? stats.inactiveWorkflows - 1 : stats.inactiveWorkflows + 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    }
  };

  const openTestWorkflow = (wf: IWorkflow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorkflowForTest(wf);
    setTestModalOpen(true);
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Never executed';
    const now = new Date();
    const date = new Date(dateStr);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-brand-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading your automation telemetry...</p>
      </div>
    );
  }

  // Max value in chart for scaling
  const maxChartValue = Math.max(...activityChart.map((d) => d.total), 5);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Here is how your automated workflows are performing.
          </p>
        </div>

        <Link
          to="/workflows/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-brand-500/25 transition-all hover:scale-102 active:scale-98"
        >
          <Plus size={18} />
          <span>+ Create Workflow</span>
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Workflows */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Workflows</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GitBranch size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats?.totalWorkflows ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">configured</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            <span>{stats?.activeWorkflows ?? 0} currently active</span>
          </div>
        </div>

        {/* Active Workflows */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Workflows</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {stats?.activeWorkflows ?? 0}
            </span>
            <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.inactiveWorkflows ?? 0} workflows paused
          </div>
        </div>

        {/* Tasks Executed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tasks Executed</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats?.totalExecutions ?? 0}
            </span>
            <span className="text-xs text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp size={12} /> {stats?.successRate ?? 100}% rate
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.successfulExecutions ?? 0} completed successfully
          </div>
        </div>

        {/* Failed Tasks */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Failed Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {stats?.failedExecutions ?? 0}
            </span>
            <span className="text-xs text-rose-700 font-medium">exceptions</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.failedExecutions === 0 ? 'All systems optimal' : 'Review in task history'}
          </div>
        </div>
      </div>

      {/* Execution Chart Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Automation Activity (Last 7 Days)</h3>
            <p className="text-xs text-slate-500">Daily breakdown of successful and failed workflow executions</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-md bg-brand-600" />
              <span>Success</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span>Failed</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-48 flex items-end justify-between gap-2 sm:gap-6 pt-6 pb-2 border-b border-slate-100">
          {activityChart.map((item, idx) => {
            const successHeight = Math.max((item.success / maxChartValue) * 100, item.success > 0 ? 10 : 0);
            const failedHeight = Math.max((item.failed / maxChartValue) * 100, item.failed > 0 ? 8 : 0);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] font-mono py-1 px-2.5 rounded-lg pointer-events-none shadow-lg whitespace-nowrap z-20">
                  {item.day} ({item.date}): {item.total} runs ({item.success} OK, {item.failed} Err)
                </div>

                {/* Bars */}
                <div className="w-full max-w-[42px] flex flex-col justify-end gap-1 h-full items-center">
                  {item.total === 0 ? (
                    <div className="w-full h-1.5 rounded-full bg-slate-100" />
                  ) : (
                    <div className="w-full flex flex-col gap-0.5 justify-end h-full">
                      {item.failed > 0 && (
                        <div
                          style={{ height: `${failedHeight}%` }}
                          className="w-full rounded-t-sm bg-rose-500 transition-all duration-300"
                        />
                      )}
                      {item.success > 0 && (
                        <div
                          style={{ height: `${successHeight}%` }}
                          className="w-full rounded-t-sm bg-brand-600 transition-all duration-300 hover:bg-brand-500"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Day label */}
                <span className="text-[11px] font-medium text-slate-500 mt-2">{item.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Workflows Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Workflows</h3>
            <p className="text-xs text-slate-500">Quickly test, toggle, or edit your automation recipes</p>
          </div>
          <Link
            to="/workflows"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            View all workflows ({stats?.totalWorkflows ?? 0}) <ArrowRight size={14} />
          </Link>
        </div>

        {recentWorkflows.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <GitBranch size={32} className="text-slate-400 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-700">No workflows found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              Get started by creating your first automated workflow with our visual builder.
            </p>
            <Link
              to="/workflows/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-medium text-xs hover:bg-brand-700"
            >
              <Plus size={14} />
              Create Workflow
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Workflow Name</th>
                  <th className="pb-3">Trigger App</th>
                  <th className="pb-3">Action App</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Last Executed</th>
                  <th className="pb-3 text-center">Tasks</th>
                  <th className="pb-3 text-right pr-2">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentWorkflows.map((wf) => (
                  <tr
                    key={wf._id || (wf as any).id}
                    onClick={() => navigate(`/workflows`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 pl-2 font-semibold text-slate-800">
                      <div>
                        <span className="group-hover:text-brand-600 transition-colors">{wf.name}</span>
                        {wf.description && (
                          <p className="text-xs text-slate-400 font-normal truncate max-w-xs">{wf.description}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <AppIcon app={wf.trigger.app} size="sm" />
                        <span className="text-xs font-medium text-slate-700 capitalize">
                          {wf.trigger.app}
                        </span>
                      </div>
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <AppIcon app={wf.action.app} size="sm" />
                        <span className="text-xs font-medium text-slate-700 capitalize">
                          {wf.action.app}
                        </span>
                      </div>
                    </td>

                    <td className="py-4">
                      <button
                        onClick={(e) => handleToggleWorkflow(wf, e)}
                        className="focus:outline-none"
                        title={wf.enabled ? 'Click to pause' : 'Click to activate'}
                      >
                        <StatusBadge status={wf.enabled ? 'active' : 'inactive'} size="sm" />
                      </button>
                    </td>

                    <td className="py-4 text-xs text-slate-500">
                      {formatRelativeTime(wf.lastExecutedAt)}
                    </td>

                    <td className="py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-medium">
                        {wf.executionCount || 0}
                      </span>
                    </td>

                    <td className="py-4 text-right pr-2">
                      <button
                        onClick={(e) => openTestWorkflow(wf, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors shadow-2xs"
                        title="Simulate and test execution"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Test</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Executions Log Feed */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Task Executions</h3>
            <p className="text-xs text-slate-500">Live operational log stream across your connected applications</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            Full Task History <ArrowRight size={14} />
          </Link>
        </div>

        {recentExecutions.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No tasks executed yet. Run a workflow test to begin.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentExecutions.map((exec) => {
              const wfName = typeof exec.workflowId === 'object' ? exec.workflowId?.name : 'Automated Workflow';
              const triggerApp = typeof exec.workflowId === 'object' ? exec.workflowId?.trigger?.app : 'Trigger';
              const actionApp = typeof exec.workflowId === 'object' ? exec.workflowId?.action?.app : 'Action';

              return (
                <div
                  key={exec._id || (exec as any).id}
                  onClick={() => navigate('/history')}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={exec.status} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{wfName}</p>
                      <p className="text-[11px] text-slate-400">
                        {triggerApp.toUpperCase()} → {actionApp.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="font-mono">{exec.duration ? `${exec.duration}ms` : '180ms'}</span>
                    <span>{formatRelativeTime(exec.startedAt)}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test Execution Modal */}
      <ExecutionTestModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        workflow={selectedWorkflowForTest}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};
