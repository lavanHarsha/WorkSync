export type TriggerApp = 
  | 'gmail'
  | 'google_sheets'
  | 'google_forms'
  | 'slack'
  | 'webhook'
  | 'schedule'
  | 'notion'
  | 'discord'
  | 'github';

export type ActionApp = 
  | 'slack'
  | 'gmail'
  | 'google_sheets'
  | 'discord'
  | 'teams'
  | 'webhook'
  | 'notion';

export type ExecutionStatus = 'success' | 'running' | 'failed';

export interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences?: {
    emailNotifications: boolean;
    workflowNotifications: boolean;
    autoRetryFailed: boolean;
  };
  webhookKey: string;
  createdAt: string;
}

export interface ITriggerConfig {
  app: TriggerApp;
  event: string;
  parameters: Record<string, any>;
  webhookId?: string;
}

export interface IConditionConfig {
  field?: string;
  operator?: 'equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists';
  value?: string;
}

export interface IActionConfig {
  app: ActionApp;
  action: string;
  parameters: Record<string, any>;
}

export interface IWorkflow {
  _id: string;
  id?: string;
  userId: string;
  name: string;
  description?: string;
  trigger: ITriggerConfig;
  action: IActionConfig;
  conditions?: IConditionConfig[];
  enabled: boolean;
  lastExecutedAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IExecutionStepLog {
  step: 'trigger' | 'condition' | 'action';
  title: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  timestamp: string;
  data?: any;
}

export interface IExecution {
  _id: string;
  id?: string;
  workflowId: IWorkflow | string;
  userId: string;
  triggerData: Record<string, any>;
  actionData?: Record<string, any>;
  status: ExecutionStatus;
  error?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  logs: IExecutionStepLog[];
  createdAt: string;
}

export interface IAppDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  connected?: boolean;
  triggers: Array<{ id: string; name: string; description: string }>;
  actions: Array<{ id: string; name: string; description: string }>;
}

export interface IDashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
}

export interface IActivityChartPoint {
  date: string;
  day: string;
  success: number;
  failed: number;
  total: number;
}
