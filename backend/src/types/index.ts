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

export type ExecutionStatus = 'success' | 'running' | 'failed' | 'queued';

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

export interface IExecutionStepLog {
  step: 'trigger' | 'condition' | 'action';
  title: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  timestamp: Date;
  data?: any;
}
