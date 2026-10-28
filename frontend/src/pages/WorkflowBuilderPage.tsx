import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { IWorkflow, TriggerApp, ActionApp } from '../types';
import { AppIcon } from '../components/AppIcon';
import { ExecutionTestModal } from '../components/ExecutionTestModal';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  Play,
  Save,
  Copy,
  Check,
  Plus,
  Trash2,
  Info,
  Sliders,
  Layers,
  HelpCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Key,
  Terminal,
  Shield,
} from 'lucide-react';

export const WorkflowBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Workflow Form State
  const [name, setName] = useState('New Automated Flow');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Trigger State
  const [selectedTriggerApp, setSelectedTriggerApp] = useState<TriggerApp>('gmail');
  const [selectedTriggerEvent, setSelectedTriggerEvent] = useState('New Email');
  const [triggerParams, setTriggerParams] = useState<Record<string, any>>({
    emailAddress: 'notifications@worksync.io',
    subjectFilter: '',
  });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Optional Conditions State
  const [conditions, setConditions] = useState<
    Array<{ field: string; operator: 'equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists'; value: string }>
  >([]);

  // Action State
  const [selectedActionApp, setSelectedActionApp] = useState<ActionApp>('slack');
  const [selectedActionType, setSelectedActionType] = useState('Send Message');
  const [actionParams, setActionParams] = useState<Record<string, any>>({
    channel: '#general',
    message: 'WorkSync Alert: New email from {{trigger.sender}} regarding "{{trigger.subject}}"',
  });

  // Saved Workflow & Test Modal
  const [savedWorkflow, setSavedWorkflow] = useState<IWorkflow | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);

  // Load existing workflow if editing
  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    } else {
      // Default webhook generator id
      const generatedWhId = 'wh_' + Math.random().toString(36).substring(2, 12);
      setWebhookUrl(api.getWebhookUrl(generatedWhId));
    }
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    try {
      setIsLoading(true);
      const res = await api.getWorkflow(workflowId);
      if (res.success && res.workflow) {
        const wf = res.workflow;
        setSavedWorkflow(wf);
        setName(wf.name);
        setDescription(wf.description || '');
        setEnabled(wf.enabled);

        setSelectedTriggerApp(wf.trigger.app);
        setSelectedTriggerEvent(wf.trigger.event);
        setTriggerParams(wf.trigger.parameters || {});

        if (wf.trigger.webhookId) {
          setWebhookUrl(api.getWebhookUrl(wf.trigger.webhookId));
        }
        if (wf.webhookSecret) {
          setWebhookSecret(wf.webhookSecret);
        }

        setSelectedActionApp(wf.action.app);
        setSelectedActionType(wf.action.action);
        setActionParams(wf.action.parameters || {});

        if (wf.conditions) {
          setConditions(wf.conditions as any);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow details');
    } finally {
      setIsLoading(false);
    }
  };

  // Supported Trigger Apps & Events
  const triggerAppOptions: Array<{
    id: TriggerApp;
    name: string;
    description: string;
    events: string[];
  }> = [
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Trigger when new emails or attachments arrive',
      events: ['New Email', 'New Attachment', 'Email Starred'],
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Trigger on new or updated rows in spreadsheets',
      events: ['New Spreadsheet Row', 'Updated Row'],
    },
    {
      id: 'google_forms',
      name: 'Google Forms',
      description: 'Trigger upon new responses or survey submissions',
      events: ['New Form Response'],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Trigger on public channel messages or mentions',
      events: ['New Channel Message', 'New Mention'],
    },
    {
      id: 'webhook',
      name: 'Webhooks by WorkSync',
      description: 'Catch real-time incoming HTTP POST payloads',
      events: ['Catch Webhook'],
    },
    {
      id: 'schedule',
      name: 'Schedule by WorkSync',
      description: 'Run periodically on timer or cron frequencies',
      events: ['Scheduled Event', 'Every Hour', 'Every Day'],
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Trigger when database entries or pages are added',
      events: ['New Database Page'],
    },
    {
      id: 'discord',
      name: 'Discord',
      description: 'Trigger on community server chat messages',
      events: ['New Channel Message'],
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Trigger on repository issues, PRs, or releases',
      events: ['New Issue Opened', 'Pull Request Created'],
    },
  ];

  // Supported Action Apps & Events
  const actionAppOptions: Array<{
    id: ActionApp;
    name: string;
    description: string;
    actions: string[];
  }> = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send formatted alerts, channel messages, or DMs',
      actions: ['Send Message', 'Send Direct Message'],
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Send automated emails with dynamic variables',
      actions: ['Send Email', 'Create Draft'],
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Append or update rows in Google Sheets',
      actions: ['Add Row', 'Update Row'],
    },
    {
      id: 'discord',
      name: 'Discord',
      description: 'Post webhook messages to Discord channels',
      actions: ['Send Message'],
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Send cards or messages to Teams channels',
      actions: ['Send Message'],
    },
    {
      id: 'webhook',
      name: 'Webhooks',
      description: 'Dispatch custom HTTP POST/GET requests to external APIs',
      actions: ['Send Request'],
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Insert new items into Notion databases',
      actions: ['Create Page'],
    },
  ];

  // Switch trigger app and update defaults
  const handleSelectTriggerApp = (appId: TriggerApp) => {
    setSelectedTriggerApp(appId);
    const appDef = triggerAppOptions.find((a) => a.id === appId);
    if (appDef && appDef.events.length > 0) {
      setSelectedTriggerEvent(appDef.events[0]);
    }

    // Set sensible default parameters
    if (appId === 'gmail') {
      setTriggerParams({ emailAddress: 'notifications@worksync.io', subjectFilter: '' });
    } else if (appId === 'google_sheets') {
      setTriggerParams({ spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', sheetName: 'Sheet1' });
    } else if (appId === 'google_forms') {
      setTriggerParams({ formId: 'form_feedback_q3' });
    } else if (appId === 'webhook') {
      const whId = 'wh_' + Math.random().toString(36).substring(2, 12);
      setTriggerParams({ eventName: 'checkout.completed', webhookId: whId });
      setWebhookUrl(api.getWebhookUrl(whId));
    } else if (appId === 'schedule') {
      setTriggerParams({ frequency: 'every_hour' });
    }
  };

  // Switch action app and update defaults
  const handleSelectActionApp = (appId: ActionApp) => {
    setSelectedActionApp(appId);
    const appDef = actionAppOptions.find((a) => a.id === appId);
    if (appDef && appDef.actions.length > 0) {
      setSelectedActionType(appDef.actions[0]);
    }

    // Set sensible default parameters
    if (appId === 'slack') {
      setActionParams({
        channel: '#general',
        message: 'Notification from WorkSync: {{trigger.subject || trigger.message}}',
      });
    } else if (appId === 'gmail') {
      setActionParams({
        recipient: 'team@company.com',
        subject: 'WorkSync Alert: {{trigger.subject}}',
        message: 'Hello team,\n\nA new trigger occurred in WorkSync.\nDetails: {{trigger.body || trigger.snippet}}',
      });
    } else if (appId === 'google_sheets') {
      setActionParams({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        sheetName: 'Sheet1',
      });
    } else if (appId === 'discord') {
      setActionParams({
        channelId: 'general-alerts',
        message: '🚀 Automated alert: {{trigger.subject || trigger.event}}',
      });
    } else if (appId === 'teams') {
      setActionParams({
        team: 'Engineering',
        channel: 'General',
        message: 'WorkSync system update: {{trigger.subject}}',
      });
    } else if (appId === 'webhook') {
      setActionParams({
        url: 'https://api.external-service.com/v1/ingest',
        method: 'POST',
      });
    } else if (appId === 'notion') {
      setActionParams({
        databaseId: 'Tasks & Automation DB',
        title: 'WorkSync: {{trigger.subject}}',
      });
    }
  };

  // Helper to insert dynamic variable tag into message field
  const insertVariableTag = (tag: string) => {
    setActionParams((prev) => ({
      ...prev,
      message: (prev.message || '') + ` {{trigger.${tag}}}`,
    }));
  };

  const handleCopyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const handleCopySecret = () => {
    if (webhookSecret) {
      navigator.clipboard.writeText(webhookSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyCurl = () => {
    const curlCmd = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-WorkSync-Secret: ${webhookSecret || 'whsec_your_secret_here'}" \\
  -d '{"event": "lead.created", "email": "user@example.com"}'`;
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Condition Helpers
  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'trigger.subject', operator: 'contains', value: '' },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: string, val: string) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, [key]: val } : c))
    );
  };

  // Save workflow payload
  const handleSaveWorkflow = async () => {
    if (!name.trim()) {
      setError('Please provide a name for your workflow');
      setCurrentStep(1);
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: Partial<IWorkflow> = {
      name,
      description,
      trigger: {
        app: selectedTriggerApp,
        event: selectedTriggerEvent,
        parameters: triggerParams,
        webhookId: selectedTriggerApp === 'webhook' ? triggerParams.webhookId : undefined,
      },
      action: {
        app: selectedActionApp,
        action: selectedActionType,
        parameters: actionParams,
      },
      conditions: conditions.filter((c) => c.field && c.value),
      enabled,
    };

    try {
      let result;
      if (isEditing && id) {
        result = await api.updateWorkflow(id, payload);
      } else {
        result = await api.createWorkflow(payload);
      }

      if (result.success && result.workflow) {
        setSavedWorkflow(result.workflow);
        if (result.workflow.webhookSecret) {
          setWebhookSecret(result.workflow.webhookSecret);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const stepsList = [
    { number: 1, title: 'Workflow Details', desc: 'Name and description' },
    { number: 2, title: 'Choose Trigger', desc: 'Select trigger app' },
    { number: 3, title: 'Configure Trigger', desc: 'Setup trigger rules' },
    { number: 4, title: 'Choose Action', desc: 'Select destination app' },
    { number: 5, title: 'Configure Action', desc: 'Format action payload' },
    { number: 6, title: 'Review & Test', desc: 'Verify and run simulation' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-brand-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading workflow builder canvas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/workflows"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Workflow' : 'Visual Workflow Builder'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
                Step {currentStep} of 6
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect triggers, evaluate filters, and execute automated actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs active:scale-95 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? 'Saving...' : 'Save Workflow'}</span>
          </button>

          <button
            onClick={() => {
              if (savedWorkflow) {
                setTestModalOpen(true);
              } else {
                handleSaveWorkflow().then(() => setTestModalOpen(true));
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all active:scale-95"
          >
            <Play size={14} fill="currentColor" />
            <span>Test Workflow</span>
          </button>
        </div>
      </div>

      {/* Success & Error alerts */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">Workflow successfully saved to MongoDB!</span>
          </div>
          <button
            onClick={() => setTestModalOpen(true)}
            className="font-bold underline hover:text-emerald-900"
          >
            Run test now →
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Visual Workflow Canvas Diagram at Top */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Flow Visualizer
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-xs text-slate-500">{enabled ? 'Status: Active' : 'Status: Paused'}</span>
          </div>
        </div>

        {/* Node Flow Connectors */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 py-2">
          {/* Trigger Node */}
          <div
            onClick={() => setCurrentStep(2)}
            className="w-full md:w-64 p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 hover:border-indigo-400 transition-all cursor-pointer shadow-xs text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                1. TRIGGER
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 font-medium">Edit</span>
            </div>
            <div className="flex items-center gap-3">
              <AppIcon app={selectedTriggerApp} size="md" />
              <div className="truncate">
                <h4 className="font-bold text-slate-900 text-sm capitalize truncate">
                  {selectedTriggerApp.replace('_', ' ')}
                </h4>
                <p className="text-xs text-slate-500 truncate">{selectedTriggerEvent}</p>
              </div>
            </div>
          </div>

          {/* Connection arrow */}
          <div className="flex items-center justify-center text-slate-300">
            <ArrowRight size={24} className="hidden md:block text-slate-400" />
            <ArrowDown size={24} className="md:hidden text-slate-400" />
          </div>

          {/* Optional Filter/Condition Node */}
          <div
            onClick={() => setCurrentStep(3)}
            className={`w-full md:w-56 p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-xs text-left group ${
              conditions.length > 0
                ? 'border-purple-200 bg-purple-50/40 hover:border-purple-400'
                : 'border-dashed border-slate-200 bg-slate-50/60 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                2. CONDITIONS
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-purple-600 font-medium">
                {conditions.length > 0 ? `${conditions.length} rule` : 'None'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Sliders size={16} />
              </div>
              <div className="truncate">
                <h4 className="font-bold text-slate-800 text-xs">
                  {conditions.length > 0 ? 'Custom Filters' : 'Optional Filter'}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {conditions.length > 0 ? `${conditions[0].field} ${conditions[0].operator}` : 'Pass all events'}
                </p>
              </div>
            </div>
          </div>

          {/* Connection arrow */}
          <div className="flex items-center justify-center text-slate-300">
            <ArrowRight size={24} className="hidden md:block text-slate-400" />
            <ArrowDown size={24} className="md:hidden text-slate-400" />
          </div>

          {/* Action Node */}
          <div
            onClick={() => setCurrentStep(4)}
            className="w-full md:w-64 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 transition-all cursor-pointer shadow-xs text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                3. ACTION
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-emerald-600 font-medium">Edit</span>
            </div>
            <div className="flex items-center gap-3">
              <AppIcon app={selectedActionApp} size="md" />
              <div className="truncate">
                <h4 className="font-bold text-slate-900 text-sm capitalize truncate">
                  {selectedActionApp.replace('_', ' ')}
                </h4>
                <p className="text-xs text-slate-500 truncate">{selectedActionType}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Wizard Progress Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stepsList.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <button
              key={step.number}
              onClick={() => setCurrentStep(step.number)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'border-brand-500 bg-white ring-2 ring-brand-100 shadow-sm'
                  : isCompleted
                  ? 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-slate-200 bg-slate-50/60 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : step.number}
                </span>
                <span className="text-xs font-bold text-slate-800 truncate">{step.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">{step.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Step Content Area */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        {/* STEP 1: Workflow Details */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Step 1 – Workflow Details</h3>
              <p className="text-xs text-slate-500">
                Give your automation an identifiable name and purpose.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Email to Slack Notification"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe what this automation does for your team or workflow..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Workflow Status</h4>
                  <p className="text-[11px] text-slate-500">
                    When active, WorkSync will process events triggered by this recipe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                    enabled ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Choose Trigger */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Step 2 – Choose Trigger Application</h3>
              <p className="text-xs text-slate-500">
                Select the service that will initiate this workflow when an event happens.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {triggerAppOptions.map((app) => {
                const isSelected = selectedTriggerApp === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => handleSelectTriggerApp(app.id)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/40 ring-4 ring-brand-100 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <AppIcon app={app.id} size="md" />
                      {isSelected && (
                        <CheckCircle2 size={18} className="text-brand-600" />
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{app.name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{app.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {app.events.slice(0, 2).map((ev, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Configure Trigger */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AppIcon app={selectedTriggerApp} size="sm" />
                <h3 className="text-lg font-bold text-slate-900 capitalize">
                  Step 3 – Configure {selectedTriggerApp.replace('_', ' ')} Trigger
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Configure event listeners and optional filtering criteria for this trigger.
              </p>
            </div>

            {/* Event selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Trigger Event *
              </label>
              <select
                value={selectedTriggerEvent}
                onChange={(e) => setSelectedTriggerEvent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium text-slate-900"
              >
                {triggerAppOptions
                  .find((a) => a.id === selectedTriggerApp)
                  ?.events.map((ev, i) => (
                    <option key={i} value={ev}>
                      {ev}
                    </option>
                  ))}
              </select>
            </div>

            {/* App specific parameter fields */}
            {selectedTriggerApp === 'gmail' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Account Address
                  </label>
                  <input
                    type="email"
                    value={triggerParams.emailAddress || ''}
                    onChange={(e) =>
                      setTriggerParams({ ...triggerParams, emailAddress: e.target.value })
                    }
                    placeholder="notifications@company.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Optional Subject Filter
                  </label>
                  <input
                    type="text"
                    value={triggerParams.subjectFilter || ''}
                    onChange={(e) =>
                      setTriggerParams({ ...triggerParams, subjectFilter: e.target.value })
                    }
                    placeholder="e.g. Quarterly, Urgent, Invoice"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Only emails with this keyword in the subject line will trigger the workflow.
                  </p>
                </div>
              </div>
            )}

            {selectedTriggerApp === 'google_sheets' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    value={triggerParams.spreadsheetId || ''}
                    onChange={(e) =>
                      setTriggerParams({ ...triggerParams, spreadsheetId: e.target.value })
                    }
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sheet Name
                  </label>
                  <input
                    type="text"
                    value={triggerParams.sheetName || 'Sheet1'}
                    onChange={(e) =>
                      setTriggerParams({ ...triggerParams, sheetName: e.target.value })
                    }
                    placeholder="Sheet1"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedTriggerApp === 'google_forms' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Google Form ID
                </label>
                <input
                  type="text"
                  value={triggerParams.formId || ''}
                  onChange={(e) => setTriggerParams({ ...triggerParams, formId: e.target.value })}
                  placeholder="e.g. 1FAIpQLSc-8k..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
            )}

            {selectedTriggerApp === 'webhook' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Generated Live Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shrink-0"
                    >
                      {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Send HTTP POST requests with JSON body to this endpoint to execute this workflow in real time.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    <Key size={13} className="text-brand-600" />
                    <span>Webhook Authentication Secret</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookSecret || (isEditing ? 'No secret generated' : 'Generated automatically on save')}
                      placeholder="Secret generated upon saving workflow"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={!webhookSecret}
                      onClick={handleCopySecret}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Secure your endpoint by passing this secret in the <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">X-WorkSync-Secret</code> header, via HMAC-SHA256 signature in <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">X-WorkSync-Signature</code>, or as <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">?secret=</code> query parameter.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-brand-400" />
                      <span className="text-xs font-semibold tracking-wide text-slate-300">Quick Test cURL Command</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCurl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-medium transition-colors"
                    >
                      {copiedCurl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono overflow-x-auto whitespace-pre p-2 bg-slate-950/60 rounded-lg text-emerald-400">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-WorkSync-Secret: ${webhookSecret || 'whsec_your_secret_here'}" \\
  -d '{"event": "lead.created", "email": "user@example.com"}'`}
                  </pre>
                </div>
              </div>
            )}

            {selectedTriggerApp === 'schedule' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Execution Frequency
                </label>
                <select
                  value={triggerParams.frequency || 'every_hour'}
                  onChange={(e) => setTriggerParams({ ...triggerParams, frequency: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="every_15_mins">Every 15 Minutes</option>
                  <option value="every_hour">Every Hour</option>
                  <option value="every_day">Once a Day (Midnight UTC)</option>
                  <option value="every_week">Weekly (Mondays at 09:00 UTC)</option>
                </select>
              </div>
            )}

            {/* Optional Condition Filters */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Optional Condition Filters</h4>
                  <p className="text-[11px] text-slate-500">Only proceed if conditions evaluate to true</p>
                </div>
                <button
                  type="button"
                  onClick={addCondition}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
                >
                  <Plus size={13} />
                  Add Filter
                </button>
              </div>

              {conditions.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No filters applied. Every event captured by this trigger will proceed to the action step.
                </p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={cond.field}
                        onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                        placeholder="field (e.g. trigger.subject)"
                        className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                      />
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                        className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium"
                      >
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="not_contains">does not contain</option>
                        <option value="exists">exists</option>
                      </select>
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                        placeholder="match value"
                        className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Choose Action */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Step 4 – Choose Action Application</h3>
              <p className="text-xs text-slate-500">
                Select where WorkSync should deliver data when the trigger fires.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actionAppOptions.map((app) => {
                const isSelected = selectedActionApp === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => handleSelectActionApp(app.id)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 ring-4 ring-emerald-100 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <AppIcon app={app.id} size="md" />
                      {isSelected && (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{app.name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{app.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {app.actions.map((act, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Configure Action */}
        {currentStep === 5 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AppIcon app={selectedActionApp} size="sm" />
                <h3 className="text-lg font-bold text-slate-900 capitalize">
                  Step 5 – Configure {selectedActionApp.replace('_', ' ')} Action
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Fill in the payload parameters and insert dynamic trigger variables.
              </p>
            </div>

            {/* Action selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Action Type *
              </label>
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium text-slate-900"
              >
                {actionAppOptions
                  .find((a) => a.id === selectedActionApp)
                  ?.actions.map((act, i) => (
                    <option key={i} value={act}>
                      {act}
                    </option>
                  ))}
              </select>
            </div>

            {/* Dynamic variable pill inserter */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                <Sparkles size={14} className="text-indigo-600" />
                Insert Dynamic Trigger Variables:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'respondentEmail',
                  'answers',
                  'submittedAt',
                  'sender',
                  'subject',
                  'body',
                  'timestamp',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariableTag(tag)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-mono font-medium hover:bg-indigo-50 transition-colors shadow-2xs"
                  >
                    +{`{{trigger.${tag}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* App specific Action fields */}
            {selectedActionApp === 'slack' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Channel *
                  </label>
                  <input
                    type="text"
                    value={actionParams.channel || '#general'}
                    onChange={(e) => setActionParams({ ...actionParams, channel: e.target.value })}
                    placeholder="#general or #alerts"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Message Content *
                  </label>
                  <textarea
                    rows={4}
                    value={actionParams.message || ''}
                    onChange={(e) => setActionParams({ ...actionParams, message: e.target.value })}
                    placeholder="New notification from {{trigger.sender}}: {{trigger.subject}}"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {selectedActionApp === 'gmail' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Recipient Email *
                  </label>
                  <input
                    type="text"
                    value={actionParams.recipient || ''}
                    onChange={(e) => setActionParams({ ...actionParams, recipient: e.target.value })}
                    placeholder="{{trigger.email}} or recipient@company.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={actionParams.subject || ''}
                    onChange={(e) => setActionParams({ ...actionParams, subject: e.target.value })}
                    placeholder="WorkSync Alert: {{trigger.subject}}"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Message Body *
                  </label>
                  <textarea
                    rows={4}
                    value={actionParams.message || ''}
                    onChange={(e) => setActionParams({ ...actionParams, message: e.target.value })}
                    placeholder="Dear Team, {{trigger.snippet}}"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {selectedActionApp === 'google_sheets' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Google Spreadsheet ID *
                  </label>
                  <input
                    type="text"
                    value={actionParams.spreadsheetId || ''}
                    onChange={(e) => setActionParams({ ...actionParams, spreadsheetId: e.target.value })}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sheet Name *
                  </label>
                  <input
                    type="text"
                    value={actionParams.sheetName || 'Sheet1'}
                    onChange={(e) => setActionParams({ ...actionParams, sheetName: e.target.value })}
                    placeholder="Sheet1"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Row Columns (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={actionParams.columns || ''}
                    onChange={(e) => setActionParams({ ...actionParams, columns: e.target.value })}
                    placeholder="{{trigger.respondentEmail}}&#10;{{trigger.submittedAt}}&#10;{{trigger.answers}}"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter values to append as cells in the row. Line 1 = Col A, Line 2 = Col B, etc.
                  </p>
                </div>
              </div>
            )}

            {selectedActionApp === 'discord' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Channel ID / Name *
                  </label>
                  <input
                    type="text"
                    value={actionParams.channelId || ''}
                    onChange={(e) => setActionParams({ ...actionParams, channelId: e.target.value })}
                    placeholder="general-alerts"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Message Content *
                  </label>
                  <textarea
                    rows={4}
                    value={actionParams.message || ''}
                    onChange={(e) => setActionParams({ ...actionParams, message: e.target.value })}
                    placeholder="🚀 Dispatch: {{trigger.subject}}"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Review & Test */}
        {currentStep === 6 && (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Step 6 – Review & Test Workflow</h3>
              <p className="text-xs text-slate-500">
                Confirm your automation mapping before activating.
              </p>
            </div>

            {/* Visual Summary Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{name}</h4>
                  <p className="text-xs text-slate-500">{description || 'No description provided'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {enabled ? 'Active on Save' : 'Paused on Save'}
                </span>
              </div>

              {/* Connected Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AppIcon app={selectedTriggerApp} size="sm" />
                    <span className="text-xs font-bold text-slate-800">Trigger: {selectedTriggerApp.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{selectedTriggerEvent}</p>
                  <pre className="mt-2 p-2 bg-slate-50 text-[11px] rounded text-slate-600 font-mono overflow-x-auto">
                    {JSON.stringify(triggerParams, null, 2)}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AppIcon app={selectedActionApp} size="sm" />
                    <span className="text-xs font-bold text-slate-800">Action: {selectedActionApp.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{selectedActionType}</p>
                  <pre className="mt-2 p-2 bg-slate-50 text-[11px] rounded text-slate-600 font-mono overflow-x-auto">
                    {JSON.stringify(actionParams, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Conditions summary */}
              {conditions.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900">
                  <strong>Filter Active:</strong> Proceed only when {conditions[0].field} {conditions[0].operator} "{conditions[0].value}"
                </div>
              )}
            </div>

            {/* Review Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={handleSaveWorkflow}
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-70"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Workflow</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (savedWorkflow) {
                    setTestModalOpen(true);
                  } else {
                    handleSaveWorkflow().then(() => setTestModalOpen(true));
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all active:scale-95"
              >
                <Play size={16} fill="currentColor" />
                <span>Test Workflow Simulation</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Footer Step Navigation */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft size={14} />
            Previous Step
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 6))}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <span>Next Step</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <Link
              to="/workflows"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Go to all workflows <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Test Execution Modal */}
      <ExecutionTestModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        workflow={
          savedWorkflow || {
            _id: 'mock_test',
            name,
            description,
            trigger: {
              app: selectedTriggerApp,
              event: selectedTriggerEvent,
              parameters: triggerParams,
            },
            action: {
              app: selectedActionApp,
              action: selectedActionType,
              parameters: actionParams,
            },
            conditions,
            enabled,
            executionCount: 0,
            userId: '',
            createdAt: '',
            updatedAt: '',
          }
        }
      />
    </div>
  );
};
