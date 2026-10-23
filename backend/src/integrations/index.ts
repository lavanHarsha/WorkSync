import { IntegrationError, invalidConfig } from './errors';
import { sendSlackMessage } from './slack';
import { sendDiscordMessage } from './discord';
import { sendTeamsMessage } from './teams';
import { sendWebhookRequest } from './webhook';
import { sendGmail } from './gmail';
import { appendSheetRow } from './googleSheets';
import { createGithubIssue } from './github';
import { createNotionPage } from './notion';
import { normalizeActionId } from './actionId';

export * from './errors';

export interface IntegrationResult {
  message: string;
  data: Record<string, any>;
}

type Handler = (userId: string, params: Record<string, any>) => Promise<IntegrationResult>;

// app -> action id (from APP_CATALOG) -> implementation
const HANDLERS: Record<string, Record<string, Handler>> = {
  slack: { send_message: sendSlackMessage },
  discord: { send_message: sendDiscordMessage },
  teams: { send_message: sendTeamsMessage },
  webhook: { send_request: (_userId, params) => sendWebhookRequest(params) },
  gmail: { send_email: sendGmail },
  google_sheets: { add_row: appendSheetRow },
  github: { create_issue: createGithubIssue },
  notion: { create_page: createNotionPage },
};

export const hasRealIntegration = (app: string): boolean => app in HANDLERS;

/**
 * Runs a real integration action. Throws IntegrationError on any failure
 * (check `.retryable`); never returns a failure result.
 */
export const executeIntegrationAction = async (
  app: string,
  action: string,
  userId: string,
  params: Record<string, any>
): Promise<IntegrationResult> => {
  const handler = HANDLERS[app]?.[normalizeActionId(action)];
  if (!handler) {
    throw invalidConfig(app, `Action "${action}" is not supported for ${app}`);
  }
  try {
    return await handler(userId, params || {});
  } catch (err: any) {
    if (err instanceof IntegrationError) throw err;
    // Unexpected programming error: surface without leaking params, and don't retry
    throw new IntegrationError(app, 'REQUEST_REJECTED', `${app} action failed unexpectedly: ${err?.message || 'unknown'}`);
  }
};
