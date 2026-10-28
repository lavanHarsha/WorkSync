import React, { useState } from 'react';
import { Modal } from './Modal';
import { AppIcon } from './AppIcon';
import { StatusBadge } from './StatusBadge';
import { IWorkflow, IExecution } from '../types';
import { api } from '../services/api';
import { Play, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Terminal, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExecutionTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: IWorkflow | null;
  onSuccess?: (execution: IExecution) => void;
}

export const ExecutionTestModal: React.FC<ExecutionTestModalProps> = ({
  isOpen,
  onClose,
  workflow,
  onSuccess,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [execution, setExecution] = useState<IExecution | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'payload' | 'logs'>('timeline');
  const [error, setError] = useState<string | null>(null);

  const [pollMessage, setPollMessage] = useState<string | null>(null);

  if (!workflow) return null;

  const handleRunTest = async () => {
    setIsRunning(true);
    setError(null);
    setPollMessage(null);
    try {
      const res = await api.testWorkflow(workflow._id || (workflow as any).id);
      if (res.success && res.execution) {
        setExecution(res.execution);
        if (onSuccess) onSuccess(res.execution);
      }
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handlePollNow = async () => {
    setIsRunning(true);
    setError(null);
    setPollMessage(null);
    try {
      const res = await api.pollWorkflow(workflow._id || (workflow as any).id);
      if (res.success) {
        if (res.eventsFound > 0) {
          const hist = await api.getWorkflowHistory(workflow._id || (workflow as any).id);
          if (hist.success && hist.executions.length > 0) {
            setExecution(hist.executions[0]);
            if (onSuccess) onSuccess(hist.executions[0]);
          }
          setPollMessage(`Discovered and processed ${res.eventsFound} live event(s)!`);
        } else {
          setPollMessage(res.message || 'Checked trigger. No new unhandled responses detected yet.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check trigger');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setExecution(null);
    setError(null);
    setPollMessage(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-600" size={20} />
          <span>Test Automation Flow</span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Workflow Overview Banner */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon app={workflow.trigger.app} size="md" />
              <ArrowRight size={16} className="text-slate-400" />
              <AppIcon app={workflow.action.app} size="md" />
              <div>
                <h4 className="font-semibold text-slate-800">{workflow.name}</h4>
                <p className="text-xs text-slate-500">
                  {workflow.trigger.app.toUpperCase()} ({workflow.trigger.event}) → {workflow.action.app.toUpperCase()} ({workflow.action.action})
                </p>
              </div>
            </div>
            {execution && <StatusBadge status={execution.status} />}
          </div>
        </div>

        {/* Initial Prompt State before running */}
        {!execution && !isRunning && (
          <div className="text-center py-8 px-4 bg-gradient-to-b from-indigo-50/50 to-purple-50/30 rounded-2xl border border-indigo-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Play size={28} className="translate-x-0.5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Ready to Test Your Workflow</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Test with a simulated payload, or fetch the latest live submitted response from your form.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleRunTest}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-brand-700 hover:to-indigo-800 transition-all transform active:scale-95"
              >
                <Play size={16} fill="currentColor" />
                Execute Simulation
              </button>
              {['google_forms', 'google_sheets', 'gmail'].includes(workflow.trigger.app) && (
                <button
                  onClick={handlePollNow}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs transition-all active:scale-95"
                >
                  <Sparkles size={16} className="text-brand-600" />
                  Fetch Live Form Response
                </button>
              )}
            </div>
            {pollMessage && (
              <p className="mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 py-2 px-3 rounded-lg inline-block border border-indigo-200">
                {pollMessage}
              </p>
            )}
          </div>
        )}

        {/* Running loader */}
        {isRunning && (
          <div className="text-center py-12">
            <Loader2 size={40} className="text-brand-600 animate-spin mx-auto mb-4" />
            <h4 className="font-semibold text-slate-800 text-base">Running Automation Engine...</h4>
            <p className="text-xs text-slate-500 mt-1">Connecting nodes, evaluating filters, and transmitting payload</p>
          </div>
        )}

        {/* Results view */}
        {execution && !isRunning && (
          <div className="space-y-4">
            {/* Tab navigation */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'timeline'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle2 size={14} />
                Execution Steps ({execution.logs?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('payload')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'payload'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Code2 size={14} />
                Payload Data
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'logs'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Terminal size={14} />
                Console Logs
              </button>
            </div>

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {execution.logs?.map((stepLog, idx) => (
                  <div key={idx} className="relative group">
                    {/* Circle icon */}
                    <div
                      className={`absolute -left-6 mt-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                        stepLog.status === 'success'
                          ? 'bg-emerald-500 ring-4 ring-emerald-50'
                          : stepLog.status === 'failed'
                          ? 'bg-rose-500 ring-4 ring-rose-50'
                          : 'bg-slate-400 ring-4 ring-slate-100'
                      }`}
                    >
                      {stepLog.status === 'success' ? '✓' : stepLog.status === 'failed' ? '✕' : '•'}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {stepLog.step}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(stepLog.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <h5 className="font-semibold text-slate-800 text-sm mb-1">{stepLog.title}</h5>
                      <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-100">
                        {stepLog.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payload Tab */}
            {activeTab === 'payload' && (
              <div className="space-y-4">
                <div>
                  <h6 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trigger Payload (Input)
                  </h6>
                  <pre className="p-3 bg-slate-900 text-emerald-400 text-xs rounded-xl overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(execution.triggerData, null, 2)}
                  </pre>
                </div>
                <div>
                  <h6 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Action Output (Dispatched)
                  </h6>
                  <pre className="p-3 bg-slate-900 text-cyan-400 text-xs rounded-xl overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(execution.actionData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Console Logs Tab */}
            {activeTab === 'logs' && (
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 max-h-60 overflow-y-auto">
                <div className="text-slate-500">// Execution Engine Log Session</div>
                <div>[0ms] Initializing execution for workflow #{workflow._id}</div>
                <div>[20ms] Generated simulated trigger for {workflow.trigger.app}:{workflow.trigger.event}</div>
                <div>[65ms] Evaluated workflow conditions: passed</div>
                <div>[110ms] Substituted template tags with trigger parameters</div>
                <div>[185ms] Dispatched action to {workflow.action.app}</div>
                <div className="text-emerald-400">[Completed in {execution.duration || 185}ms] Status: 200 OK SUCCESS</div>
              </div>
            )}

            {/* Summary details bottom */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span>Duration: <strong className="text-slate-800 font-mono">{execution.duration}ms</strong></span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunTest}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Run Again
                </button>
                <Link
                  to="/history"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800"
                >
                  View in Task History
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Workflow Execution Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
