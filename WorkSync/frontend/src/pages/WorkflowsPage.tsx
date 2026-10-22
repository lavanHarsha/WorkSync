import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { IWorkflow } from '../types';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge } from '../components/StatusBadge';
import { ExecutionTestModal } from '../components/ExecutionTestModal';
import {
  Plus,
  Search,
  Filter,
  Play,
  Edit2,
  Copy,
  Trash2,
  History,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitBranch,
} from 'lucide-react';

export const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState<IWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'failed' | 'recent'>('all');

  // Test modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedWorkflowForTest, setSelectedWorkflowForTest] = useState<IWorkflow | null>(null);

  // Delete modal state
  const [workflowToDelete, setWorkflowToDelete] = useState<IWorkflow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (activeFilter === 'active') params.status = 'active';
      if (activeFilter === 'inactive') params.status = 'inactive';
      if (activeFilter === 'recent') params.sort = 'recent';
      if (searchQuery) params.search = searchQuery;

      const data = await api.getWorkflows(params);
      if (data.success) {
        setWorkflows(data.workflows);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkflows();
  };

  const handleToggle = async (workflow: IWorkflow, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const id = workflow._id || (workflow as any).id;
      const res = await api.toggleWorkflow(id);
      if (res.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w._id === id || (w as any).id === id ? { ...w, enabled: res.enabled } : w))
        );
      }
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    }
  };

  const handleDuplicate = async (workflow: IWorkflow, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const id = workflow._id || (workflow as any).id;
      const res = await api.duplicateWorkflow(id);
      if (res.success && res.workflow) {
        setWorkflows([res.workflow, ...workflows]);
      }
    } catch (err) {
      console.error('Failed to duplicate workflow:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return;
    setIsDeleting(true);
    try {
      const id = workflowToDelete._id || (workflowToDelete as any).id;
      const res = await api.deleteWorkflow(id);
      if (res.success) {
        setWorkflows(workflows.filter((w) => w._id !== id && (w as any).id !== id));
        setWorkflowToDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const openTestModal = (wf: IWorkflow, e: React.MouseEvent) => {
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

  const filterTabs = [
    { id: 'all', label: 'All Workflows' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'recent', label: 'Recently Created' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Workflows
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage, trigger, duplicate, and monitor your automated flows
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

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </form>
      </div>

      {/* Workflows List / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 size={32} className="text-brand-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <GitBranch size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No workflows found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-6">
            {searchQuery
              ? 'No workflows matched your search criteria. Try a different query.'
              : 'Create your first workflow to automate repetitive tasks across your applications.'}
          </p>
          <Link
            to="/workflows/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-xs shadow-md shadow-brand-500/20 hover:bg-brand-700 transition-all"
          >
            <Plus size={16} />
            <span>Create Workflow</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {workflows.map((wf) => {
            const wfId = wf._id || (wf as any).id;
            return (
              <div
                key={wfId}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-brand-300 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Workflow info & Visual Nodes */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {wf.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => handleToggle(wf, e)}
                        className="cursor-pointer"
                        title={wf.enabled ? 'Click to pause' : 'Click to activate'}
                      >
                        <StatusBadge status={wf.enabled ? 'active' : 'inactive'} size="sm" />
                      </button>
                    </div>

                    {wf.description && (
                      <p className="text-xs text-slate-500 max-w-2xl">{wf.description}</p>
                    )}

                    {/* Trigger -> Action pill */}
                    <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-fit">
                      <div className="flex items-center gap-2">
                        <AppIcon app={wf.trigger.app} size="sm" />
                        <span className="font-semibold text-slate-700 capitalize">
                          {wf.trigger.app} ({wf.trigger.event})
                        </span>
                      </div>

                      <ArrowRight size={14} className="text-slate-400" />

                      <div className="flex items-center gap-2">
                        <AppIcon app={wf.action.app} size="sm" />
                        <span className="font-semibold text-slate-700 capitalize">
                          {wf.action.app} ({wf.action.action})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Stats & Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right text-xs">
                      <span className="text-slate-400 block text-[11px]">Tasks Executed</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">{wf.executionCount || 0}</span>
                    </div>

                    <div className="text-left lg:text-right text-xs">
                      <span className="text-slate-400 block text-[11px]">Last Run</span>
                      <span className="font-medium text-slate-700">{formatRelativeTime(wf.lastExecutedAt)}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => openTestModal(wf, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors shadow-2xs"
                        title="Simulate and test execution"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Test Now</span>
                      </button>

                      <Link
                        to={`/workflows/${wfId}/edit`}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                        title="Edit Workflow"
                      >
                        <Edit2 size={16} />
                      </Link>

                      <button
                        onClick={(e) => handleDuplicate(wf, e)}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                        title="Duplicate Workflow"
                      >
                        <Copy size={16} />
                      </button>

                      <Link
                        to={`/history?workflowId=${wfId}`}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                        title="View Execution History"
                      >
                        <History size={16} />
                      </Link>

                      <button
                        onClick={() => setWorkflowToDelete(wf)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Workflow"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Workflow?</h3>
            <p className="text-xs text-slate-600 mb-6">
              Are you sure you want to delete <strong className="text-slate-800 font-semibold">{workflowToDelete.name}</strong>? All associated execution logs and webhook listeners will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setWorkflowToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Execution Modal */}
      <ExecutionTestModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        workflow={selectedWorkflowForTest}
        onSuccess={() => {
          fetchWorkflows();
        }}
      />
    </div>
  );
};
