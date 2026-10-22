import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { IExecution } from '../types';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  History,
  Search,
  Filter,
  Trash2,
  Clock,
  ArrowRight,
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export const TaskHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const workflowIdParam = searchParams.get('workflowId');

  const [executions, setExecutions] = useState<IExecution[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Execution Details Modal
  const [selectedExecution, setSelectedExecution] = useState<IExecution | null>(null);
  const [detailsTab, setDetailsTab] = useState<'timeline' | 'payload' | 'logs'>('timeline');

  // Clear confirmation
  const [isClearing, setIsClearing] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 30 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (workflowIdParam) params.workflowId = workflowIdParam;

      const data = await api.getHistory(params);
      if (data.success) {
        setExecutions(data.executions);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, page, workflowIdParam]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all task execution history?')) {
      return;
    }
    setIsClearing(true);
    try {
      const res = await api.clearHistory();
      if (res.success) {
        setExecutions([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Task History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit logs and real-time execution telemetry for all automated workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClearHistory}
            disabled={isClearing || executions.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          {['all', 'success', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? `All (${total})` : st}
            </button>
          ))}

          {workflowIdParam && (
            <span className="ml-2 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 flex items-center gap-1">
              Filtered by workflow
              <Link to="/history" className="font-bold hover:underline ml-1">
                ✕
              </Link>
            </span>
          )}
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="text-brand-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500">Retrieving execution logs...</p>
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-16">
            <History size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No execution history found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              When workflows are triggered by webhook or tested, audit records will appear here.
            </p>
            <Link
              to="/workflows"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
            >
              <span>Test a workflow now</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 pl-6">Workflow</th>
                  <th className="py-3.5">Trigger</th>
                  <th className="py-3.5">Action</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5">Started At</th>
                  <th className="py-3.5">Completed At</th>
                  <th className="py-3.5">Duration</th>
                  <th className="py-3.5 pr-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executions.map((exec) => {
                  const wf = typeof exec.workflowId === 'object' ? exec.workflowId : null;
                  const wfName = wf?.name || 'Automated Flow';
                  const triggerApp = wf?.trigger?.app || 'trigger';
                  const actionApp = wf?.action?.app || 'action';

                  return (
                    <tr
                      key={exec._id || (exec as any).id}
                      onClick={() => setSelectedExecution(exec)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 pl-6 font-semibold text-slate-800 group-hover:text-brand-600">
                        {wfName}
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <AppIcon app={triggerApp} size="sm" />
                          <span className="text-xs font-medium text-slate-700 capitalize">
                            {triggerApp}
                          </span>
                        </div>
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <AppIcon app={actionApp} size="sm" />
                          <span className="text-xs font-medium text-slate-700 capitalize">
                            {actionApp}
                          </span>
                        </div>
                      </td>

                      <td className="py-4">
                        <StatusBadge status={exec.status} size="sm" />
                      </td>

                      <td className="py-4 text-xs text-slate-500 font-mono">
                        {formatDate(exec.startedAt)}
                      </td>

                      <td className="py-4 text-xs text-slate-500 font-mono">
                        {formatDate(exec.completedAt)}
                      </td>

                      <td className="py-4 text-xs font-mono font-semibold text-slate-700">
                        {exec.duration !== undefined ? `${exec.duration}ms` : '-'}
                      </td>

                      <td className="py-4 pr-6 text-right">
                        <span className="text-xs text-brand-600 font-semibold inline-flex items-center gap-1 group-hover:underline">
                          Inspect <ChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution Details Drawer / Modal */}
      <Modal
        isOpen={Boolean(selectedExecution)}
        onClose={() => setSelectedExecution(null)}
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-brand-600" />
              <span>Execution Inspection</span>
            </div>
            {selectedExecution && <StatusBadge status={selectedExecution.status} />}
          </div>
        }
        maxWidth="2xl"
      >
        {selectedExecution && (
          <div className="space-y-6">
            {/* Quick telemetry stats */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Execution ID</span>
                <span className="font-mono font-semibold text-slate-800 truncate block">
                  {selectedExecution._id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Execution Duration</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedExecution.duration || 0}ms
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Started At</span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedExecution.startedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Error box if failed */}
            {selectedExecution.error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Execution Error Encountered:</strong>
                  <span>{selectedExecution.error}</span>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setDetailsTab('timeline')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  detailsTab === 'timeline'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle2 size={14} />
                Execution Steps ({selectedExecution.logs?.length || 0})
              </button>
              <button
                onClick={() => setDetailsTab('payload')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  detailsTab === 'payload'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Code2 size={14} />
                Payload Snapshots
              </button>
              <button
                onClick={() => setDetailsTab('logs')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  detailsTab === 'logs'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Terminal size={14} />
                Raw JSON
              </button>
            </div>

            {/* Tab: Timeline */}
            {detailsTab === 'timeline' && (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {selectedExecution.logs?.map((stepLog, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 mt-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                        stepLog.status === 'success'
                          ? 'bg-emerald-500'
                          : stepLog.status === 'failed'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    >
                      {stepLog.status === 'success' ? '✓' : stepLog.status === 'failed' ? '✕' : '•'}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="font-bold uppercase tracking-wider text-slate-500">
                          {stepLog.step}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(stepLog.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <h5 className="font-semibold text-slate-800 text-sm mb-1">{stepLog.title}</h5>
                      <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200">
                        {stepLog.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Payload */}
            {detailsTab === 'payload' && (
              <div className="space-y-4">
                <div>
                  <h6 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trigger Payload (Data In)
                  </h6>
                  <pre className="p-3 bg-slate-900 text-emerald-400 text-xs rounded-xl overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(selectedExecution.triggerData, null, 2)}
                  </pre>
                </div>
                <div>
                  <h6 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Action Output (Dispatched Data)
                  </h6>
                  <pre className="p-3 bg-slate-900 text-cyan-400 text-xs rounded-xl overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(selectedExecution.actionData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab: Raw JSON */}
            {detailsTab === 'logs' && (
              <div>
                <pre className="p-4 bg-slate-950 text-slate-200 text-xs rounded-xl overflow-x-auto max-h-80 font-mono">
                  {JSON.stringify(selectedExecution, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
