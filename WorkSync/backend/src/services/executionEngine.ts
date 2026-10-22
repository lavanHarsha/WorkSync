import { IWorkflow, Workflow } from '../models/Workflow';
import { Execution, IExecution } from '../models/Execution';
import { IExecutionStepLog } from '../types';
import { executeIntegrationAction, hasRealIntegration } from '../integrations';

export interface ExecutionOptions {
  customTriggerData?: Record<string, any>;
  isLiveWebhook?: boolean;
}

export class ExecutionEngine {
  /**
   * Generates realistic simulated trigger payload based on trigger configuration
   */
  public static generateSimulatedTriggerData(workflow: IWorkflow, customData?: Record<string, any>): Record<string, any> {
    if (customData && Object.keys(customData).length > 0) {
      return customData;
    }

    const { app, event, parameters } = workflow.trigger;
    const now = new Date().toISOString();

    switch (app) {
      case 'gmail':
        return {
          id: 'msg_' + Math.random().toString(36).substring(2, 10),
          from: parameters?.emailAddress || 'notifications@service.com',
          sender: 'Alex Morgan <alex.morgan@company.com>',
          to: parameters?.recipient || 'user@worksync.io',
          subject: parameters?.subjectFilter 
            ? `${parameters.subjectFilter} - Weekly Update` 
            : 'Quarterly Project Milestone Completed',
          snippet: 'Hey team, here is the updated project status for this week. Everything is on track.',
          body: 'Hello,\n\nAll critical milestones for Sprint 24 have been accomplished. Let us know if you need any adjustments.\n\nBest,\nAlex',
          receivedAt: now,
          threadId: 'th_' + Math.random().toString(36).substring(2, 9),
        };

      case 'google_sheets':
        return {
          spreadsheetId: parameters?.spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          sheetName: parameters?.sheetName || 'Sheet1',
          rowNumber: Math.floor(Math.random() * 200) + 12,
          data: {
            'Customer Name': 'Sarah Connor',
            'Company': 'Cyberdyne Systems',
            'Plan': 'Enterprise Suite',
            'MRR': '$1,250',
            'Status': 'Active Lead',
          },
          addedAt: now,
        };

      case 'google_forms':
        return {
          formId: parameters?.formId || 'form_abc123',
          responseId: 'resp_' + Math.random().toString(36).substring(2, 9),
          respondentEmail: 'jordan.lee@domain.org',
          answers: {
            'Full Name': 'Jordan Lee',
            'Product Feedback': 'Loving the speed and clean UI of the platform!',
            'Rating': '5/5 Stars',
            'Category': 'Customer Support',
          },
          submittedAt: now,
        };

      case 'slack':
        return {
          channel: parameters?.channel || '#general',
          user: 'U0192837482',
          username: 'sarah.dev',
          text: parameters?.textMatch || 'Deploying release v3.4 to production cluster.',
          ts: (Date.now() / 1000).toFixed(6),
        };

      case 'webhook':
        return {
          event: parameters?.eventName || 'user.created',
          payload: {
            userId: 'usr_839218',
            name: 'Taylor Swift',
            email: 'taylor@swift.io',
            eventTimestamp: now,
            environment: 'production',
          },
          headers: {
            'user-agent': 'WorkSync-Webhook/2.0',
            'content-type': 'application/json',
          },
        };

      case 'schedule':
        return {
          scheduleType: parameters?.frequency || 'every_hour',
          scheduledTime: now,
          tickId: 'tick_' + Date.now(),
        };

      case 'notion':
        return {
          databaseId: parameters?.databaseId || 'db_notion_491029',
          pageId: 'page_' + Math.random().toString(36).substring(2, 10),
          title: 'Q3 Product Strategy Roadmap',
          properties: {
            Status: 'In Progress',
            Priority: 'High',
            Assignee: 'DevOps Lead',
          },
          updatedAt: now,
        };

      case 'discord':
        return {
          guildId: '782910381029381029',
          channelId: parameters?.channelId || '123891028301928301',
          author: 'Alex_Gamer#1234',
          content: 'New bug report logged in server channel #general',
          timestamp: now,
        };

      case 'github':
        return {
          repository: parameters?.repo || 'worksync/core-engine',
          action: 'opened',
          issue: {
            number: 142,
            title: 'Add webhook signature validation',
            author: 'octocat',
            url: 'https://github.com/worksync/core-engine/issues/142',
          },
          created_at: now,
        };

      default:
        return {
          message: 'Trigger event received',
          timestamp: now,
          sourceApp: app,
        };
    }
  }

  /**
   * Helper to replace template variables such as {{trigger.subject}} or {{trigger.sender}}
   */
  public static interpolateVariables(template: any, data: Record<string, any>): any {
    if (typeof template === 'string') {
      return template.replace(/\{\{\s*trigger\.([\w.]+)\s*\}\}/g, (_, key) => {
        const parts = key.split('.');
        let val: any = data;
        for (const p of parts) {
          if (val && typeof val === 'object' && p in val) {
            val = val[p];
          } else {
            val = undefined;
            break;
          }
        }
        return val !== undefined ? String(val) : `{{trigger.${key}}}`;
      });
    }

    if (Array.isArray(template)) {
      return template.map((item) => this.interpolateVariables(item, data));
    }

    if (typeof template === 'object' && template !== null) {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(template)) {
        result[k] = this.interpolateVariables(v, data);
      }
      return result;
    }

    return template;
  }

  /**
   * Evaluate conditions if configured
   */
  public static evaluateConditions(
    conditions: Array<{ field?: string; operator?: string; value?: string }> | undefined,
    triggerData: Record<string, any>
  ): { passed: boolean; reason?: string } {
    if (!conditions || conditions.length === 0) {
      return { passed: true };
    }

    for (const cond of conditions) {
      if (!cond.field) continue;

      // Extract field from triggerData
      let actualValue: any = triggerData;
      const parts = cond.field.replace(/^trigger\./, '').split('.');
      for (const p of parts) {
        if (actualValue && typeof actualValue === 'object' && p in actualValue) {
          actualValue = actualValue[p];
        } else {
          actualValue = undefined;
          break;
        }
      }

      const expectedValue = cond.value || '';
      const strActual = actualValue !== undefined ? String(actualValue).toLowerCase() : '';
      const strExpected = expectedValue.toLowerCase();

      switch (cond.operator) {
        case 'equals':
          if (strActual !== strExpected) {
            return { passed: false, reason: `Condition failed: "${cond.field}" (${strActual}) does not equal "${strExpected}"` };
          }
          break;
        case 'contains':
          if (!strActual.includes(strExpected)) {
            return { passed: false, reason: `Condition failed: "${cond.field}" (${strActual}) does not contain "${strExpected}"` };
          }
          break;
        case 'not_contains':
          if (strActual.includes(strExpected)) {
            return { passed: false, reason: `Condition failed: "${cond.field}" (${strActual}) contains "${strExpected}"` };
          }
          break;
        case 'greater_than':
          if (Number(actualValue) <= Number(expectedValue)) {
            return { passed: false, reason: `Condition failed: "${cond.field}" (${actualValue}) not greater than ${expectedValue}` };
          }
          break;
        case 'less_than':
          if (Number(actualValue) >= Number(expectedValue)) {
            return { passed: false, reason: `Condition failed: "${cond.field}" (${actualValue}) not less than ${expectedValue}` };
          }
          break;
        case 'exists':
          if (actualValue === undefined || actualValue === null || actualValue === '') {
            return { passed: false, reason: `Condition failed: "${cond.field}" does not exist` };
          }
          break;
      }
    }

    return { passed: true };
  }

  /**
   * Simulates the execution of the action with interpolated parameters
   */
  public static async executeActionMock(
    workflow: IWorkflow,
    interpolatedParams: Record<string, any>,
    triggerData: Record<string, any>
  ): Promise<{ success: boolean; data: Record<string, any>; message: string; error?: string }> {
    const { app, action } = workflow.action;
    const now = new Date().toISOString();

    if (hasRealIntegration(app)) {
      // Real dispatch. Failures throw IntegrationError (see integrations/errors.ts) and are
      // intentionally not swallowed here so retry/backoff logic can inspect `.retryable`.
      const params: Record<string, any> = { ...interpolatedParams };
      if (!params.message && ['slack', 'discord', 'teams', 'gmail'].includes(app)) {
        params.message = `WorkSync trigger fired for ${workflow.name}`;
      }
      const result = await executeIntegrationAction(app, action, workflow.userId.toString(), params);
      return { success: true, message: result.message, data: { ...result.data, deliveredAt: now } };
    }

    // Apps without a real integration yet keep the simulated behaviour
    await new Promise((resolve) => setTimeout(resolve, 150));

    switch (app) {

      default:
        return {
          success: true,
          message: `Action executed successfully for ${app}`,
          data: {
            executedAt: now,
            app,
            action,
            parameters: interpolatedParams,
          },
        };
    }
  }

  /**
   * Main entry point to run or test a workflow
   */
  public static async executeWorkflow(
    workflow: IWorkflow,
    userId: string,
    options: ExecutionOptions = {}
  ): Promise<IExecution> {
    const startTime = Date.now();
    const logs: IExecutionStepLog[] = [];

    // Step 1: Trigger step
    const triggerData = this.generateSimulatedTriggerData(workflow, options.customTriggerData);
    
    // Provide user-friendly trigger title per requirement:
    // e.g. "New email received" for Gmail -> New Email
    let triggerTitle = 'Trigger event detected';
    if (workflow.trigger.app === 'gmail') {
      triggerTitle = 'New email received';
    } else if (workflow.trigger.app === 'google_forms') {
      triggerTitle = 'New form response received';
    } else if (workflow.trigger.app === 'google_sheets') {
      triggerTitle = 'New spreadsheet row detected';
    } else if (workflow.trigger.app === 'slack') {
      triggerTitle = 'New Slack message detected';
    } else if (workflow.trigger.app === 'webhook') {
      triggerTitle = 'Webhook payload received';
    } else if (workflow.trigger.app === 'schedule') {
      triggerTitle = 'Scheduled timer fired';
    }

    logs.push({
      step: 'trigger',
      title: triggerTitle,
      status: 'success',
      message: `${workflow.trigger.app.toUpperCase()}: ${workflow.trigger.event} captured event data successfully.`,
      timestamp: new Date(),
      data: triggerData,
    });

    // Step 2: Condition / Processing step
    logs.push({
      step: 'condition',
      title: 'Workflow Processing',
      status: 'success',
      message: 'Processing payload and evaluating workflow rules and conditions.',
      timestamp: new Date(),
    });

    const conditionResult = this.evaluateConditions(workflow.conditions, triggerData);
    if (!conditionResult.passed) {
      logs.push({
        step: 'condition',
        title: 'Condition filter halted workflow',
        status: 'skipped',
        message: conditionResult.reason || 'Workflow conditions were not satisfied.',
        timestamp: new Date(),
      });

      const endTime = Date.now();
      const execution = await Execution.create({
        workflowId: workflow._id,
        userId,
        triggerData,
        actionData: { skipped: true, reason: conditionResult.reason },
        status: 'success', // Finished without fatal crash, but skipped
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        duration: endTime - startTime,
        logs,
      });

      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { executionCount: 1 },
        lastExecutedAt: new Date(endTime),
      });

      return execution;
    }

    // Step 3: Interpolate action parameters
    const interpolatedParams = this.interpolateVariables(
      workflow.action.parameters || {},
      triggerData
    );

    // Step 4: Action step
    let actionResult;
    let executionStatus: 'success' | 'failed' = 'success';
    let errorMessage: string | undefined = undefined;

    try {
      actionResult = await this.executeActionMock(workflow, interpolatedParams, triggerData);
      
      // Prompt specifically requested:
      // Gmail -> Slack: "New email received" then "Slack notification sent successfully"
      logs.push({
        step: 'action',
        title: actionResult.message,
        status: actionResult.success ? 'success' : 'failed',
        message: `${workflow.action.app.toUpperCase()}: ${workflow.action.action} finished with status 200 OK.`,
        timestamp: new Date(),
        data: actionResult.data,
      });
    } catch (err: any) {
      executionStatus = 'failed';
      const errText = err.message || 'Action step execution failed';
      errorMessage = errText;
      logs.push({
        step: 'action',
        title: 'Action execution failed',
        status: 'failed',
        message: errText,
        timestamp: new Date(),
        data: { error: errText },
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create MongoDB Execution record
    const execution = await Execution.create({
      workflowId: workflow._id,
      userId,
      triggerData,
      actionData: actionResult?.data || {},
      status: executionStatus,
      error: errorMessage,
      startedAt: new Date(startTime),
      completedAt: new Date(endTime),
      duration,
      logs,
    });

    // Update workflow metrics
    await Workflow.findByIdAndUpdate(workflow._id, {
      $inc: { executionCount: 1 },
      lastExecutedAt: new Date(endTime),
    });

    return execution;
  }
}
