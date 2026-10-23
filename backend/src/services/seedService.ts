import mongoose from 'mongoose';
import { Workflow } from '../models/Workflow';
import { Execution } from '../models/Execution';
import { Integration } from '../models/Integration';

export class SeedService {
  public static async seedUserData(userId: string | mongoose.Types.ObjectId): Promise<void> {
    // Real accounts must never receive fake workflows, fake history or fake "connected" apps.
    if (process.env.ENABLE_DEMO_MODE !== 'true') return;
    const existingWorkflows = await Workflow.find({ userId });
    if (existingWorkflows.length > 0) {
      return; // Already seeded
    }

    // 1. Mandatory Demo Workflow: Email to Slack Notification
    const emailToSlack = await Workflow.create({
      userId,
      name: 'Email to Slack Notification',
      description: 'Automatically notify our internal Slack channel when an important email arrives in Gmail.',
      trigger: {
        app: 'gmail',
        event: 'New Email',
        parameters: {
          emailAddress: 'notifications@worksync.io',
          subjectFilter: 'Quarterly',
        },
      },
      action: {
        app: 'slack',
        action: 'Send Message',
        parameters: {
          channel: '#general',
          message: 'Incoming message from {{trigger.sender}}: "{{trigger.subject}}" - {{trigger.snippet}}',
        },
      },
      conditions: [
        {
          field: 'trigger.subject',
          operator: 'contains',
          value: 'Quarterly',
        },
      ],
      enabled: true,
      executionCount: 14,
      lastExecutedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
    });

    // 2. Google Form to Discord Lead Bot
    const formToDiscord = await Workflow.create({
      userId,
      name: 'Form Responses to Discord Alerts',
      description: 'Stream customer feedback submissions from Google Forms directly to our #leads channel.',
      trigger: {
        app: 'google_forms',
        event: 'New Response',
        parameters: {
          formId: 'product-feedback-v2',
        },
      },
      action: {
        app: 'discord',
        action: 'Send Message',
        parameters: {
          channelId: 'feedbacks-hub',
          message: 'New feedback submitted by {{trigger.respondentEmail}}: {{trigger.answers.Product Feedback}}',
        },
      },
      enabled: true,
      executionCount: 8,
      lastExecutedAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
    });

    // 3. Webhook to Google Sheets Logger
    const webhookToSheets = await Workflow.create({
      userId,
      name: 'Webhook Ingestion to Sheets',
      description: 'Capture inbound checkout & signup webhooks and log them into Google Sheets CRM.',
      trigger: {
        app: 'webhook',
        event: 'Catch Webhook',
        parameters: {
          eventName: 'checkout.completed',
        },
        webhookId: 'wh_' + Math.random().toString(36).substring(2, 12),
      },
      action: {
        app: 'google_sheets',
        action: 'Add Row',
        parameters: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          sheetName: 'Transactions',
        },
      },
      enabled: true,
      executionCount: 32,
      lastExecutedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
    });

    // 4. Inactive Scheduled Workflow for realistic dashboard variety
    await Workflow.create({
      userId,
      name: 'Weekly Backup to Teams',
      description: 'Run weekly database snapshot notification to leadership Teams channel.',
      trigger: {
        app: 'schedule',
        event: 'Scheduled Event',
        parameters: {
          frequency: 'every_week',
        },
      },
      action: {
        app: 'teams',
        action: 'Send Message',
        parameters: {
          team: 'Executive Operations',
          channel: 'Announcements',
          message: 'Weekly WorkSync maintenance backup successfully completed.',
        },
      },
      enabled: false,
      executionCount: 4,
      lastExecutedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
    });

    // Seed realistic sample executions for analytics & history
    const sampleExecutions = [
      {
        workflowId: emailToSlack._id,
        userId,
        status: 'success',
        duration: 184,
        startedAt: new Date(Date.now() - 25 * 60 * 1000),
        completedAt: new Date(Date.now() - 25 * 60 * 1000 + 184),
        triggerData: {
          from: 'notifications@worksync.io',
          sender: 'Alex Morgan <alex.morgan@company.com>',
          subject: 'Quarterly Project Milestone Completed',
          snippet: 'Hey team, here is the updated project status for this week.',
        },
        actionData: {
          channel: '#general',
          deliveredAt: new Date().toISOString(),
          status: 'Delivered to workspace',
        },
        logs: [
          {
            step: 'trigger',
            title: 'New email received',
            status: 'success',
            message: 'GMAIL: New Email captured event data successfully.',
            timestamp: new Date(Date.now() - 25 * 60 * 1000),
          },
          {
            step: 'condition',
            title: 'Workflow Processing',
            status: 'success',
            message: 'Processing payload and evaluating workflow rules and conditions.',
            timestamp: new Date(Date.now() - 25 * 60 * 1000 + 50),
          },
          {
            step: 'action',
            title: 'Slack notification sent successfully',
            status: 'success',
            message: 'SLACK: Send Message finished with status 200 OK.',
            timestamp: new Date(Date.now() - 25 * 60 * 1000 + 184),
          },
        ],
      },
      {
        workflowId: webhookToSheets._id,
        userId,
        status: 'success',
        duration: 215,
        startedAt: new Date(Date.now() - 10 * 60 * 1000),
        completedAt: new Date(Date.now() - 10 * 60 * 1000 + 215),
        triggerData: {
          event: 'checkout.completed',
          payload: { orderId: 'ord_9182', amount: 149.00, customer: 'Taylor Swift' },
        },
        actionData: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          sheet: 'Transactions',
          rowsAdded: 1,
        },
        logs: [
          {
            step: 'trigger',
            title: 'Webhook payload received',
            status: 'success',
            message: 'WEBHOOK: Catch Webhook captured event data successfully.',
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
          },
          {
            step: 'condition',
            title: 'Workflow Processing',
            status: 'success',
            message: 'Processing payload and evaluating workflow rules.',
            timestamp: new Date(Date.now() - 10 * 60 * 1000 + 60),
          },
          {
            step: 'action',
            title: 'Row appended to Google Sheets successfully',
            status: 'success',
            message: 'GOOGLE_SHEETS: Add Row finished with status 200 OK.',
            timestamp: new Date(Date.now() - 10 * 60 * 1000 + 215),
          },
        ],
      },
      {
        workflowId: formToDiscord._id,
        userId,
        status: 'success',
        duration: 165,
        startedAt: new Date(Date.now() - 3 * 3600 * 1000),
        completedAt: new Date(Date.now() - 3 * 3600 * 1000 + 165),
        triggerData: {
          formId: 'product-feedback-v2',
          respondentEmail: 'jordan.lee@domain.org',
          answers: { 'Product Feedback': 'Loving the speed and clean UI!' },
        },
        actionData: {
          channel: 'feedbacks-hub',
          status: 204,
        },
        logs: [
          {
            step: 'trigger',
            title: 'New form response received',
            status: 'success',
            message: 'GOOGLE_FORMS: New Response captured event data successfully.',
            timestamp: new Date(Date.now() - 3 * 3600 * 1000),
          },
          {
            step: 'condition',
            title: 'Workflow Processing',
            status: 'success',
            message: 'Processing payload.',
            timestamp: new Date(Date.now() - 3 * 3600 * 1000 + 40),
          },
          {
            step: 'action',
            title: 'Discord webhook message posted successfully',
            status: 'success',
            message: 'DISCORD: Send Message finished with status 200 OK.',
            timestamp: new Date(Date.now() - 3 * 3600 * 1000 + 165),
          },
        ],
      },
      {
        workflowId: emailToSlack._id,
        userId,
        status: 'failed',
        error: 'Rate limit exceeded on external Slack API (HTTP 429)',
        duration: 310,
        startedAt: new Date(Date.now() - 14 * 3600 * 1000),
        completedAt: new Date(Date.now() - 14 * 3600 * 1000 + 310),
        triggerData: {
          from: 'alert@monitoring.io',
          subject: 'Database Spike Alert',
        },
        actionData: {},
        logs: [
          {
            step: 'trigger',
            title: 'New email received',
            status: 'success',
            message: 'GMAIL: New Email received.',
            timestamp: new Date(Date.now() - 14 * 3600 * 1000),
          },
          {
            step: 'action',
            title: 'Action execution failed',
            status: 'failed',
            message: 'Rate limit exceeded on external Slack API (HTTP 429)',
            timestamp: new Date(Date.now() - 14 * 3600 * 1000 + 310),
          },
        ],
      },
    ];

    await Execution.insertMany(sampleExecutions);

    // Seed default connected apps
    await Integration.insertMany([
      { userId, appId: 'slack', name: 'Slack', connected: true, connectedAt: new Date() },
      { userId, appId: 'gmail', name: 'Gmail', connected: true, connectedAt: new Date() },
      { userId, appId: 'google_sheets', name: 'Google Sheets', connected: true, connectedAt: new Date() },
      { userId, appId: 'google_forms', name: 'Google Forms', connected: true, connectedAt: new Date() },
      { userId, appId: 'discord', name: 'Discord', connected: false },
      { userId, appId: 'webhook', name: 'Webhooks', connected: true, connectedAt: new Date() },
      { userId, appId: 'teams', name: 'Microsoft Teams', connected: false },
      { userId, appId: 'notion', name: 'Notion', connected: false },
    ]);
  }
}
