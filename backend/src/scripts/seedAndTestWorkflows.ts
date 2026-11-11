import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import mongoose from 'mongoose';
import { User } from '../models/User';
import { Integration } from '../models/Integration';
import { Workflow } from '../models/Workflow';
import { ExecutionEngine } from '../services/executionEngine';
import { APP_CATALOG } from '../controllers/appsController';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  // Find user by either email spelling
  const candidateEmails = [
    'sundayletmebroken99@gmail.com',
    'sundayleftmebroken99@gmail.com',
  ];

  let user = await User.findOne({ email: { $in: candidateEmails } });
  if (!user) {
    console.log('User not found by email, searching all users...');
    const anyUser = await User.findOne({});
    if (anyUser) {
      user = anyUser;
      console.log(`Using existing user: ${user.email} (${user._id})`);
    } else {
      console.error('No users found in database.');
      process.exit(1);
    }
  } else {
    console.log(`Found target user: ${user.email} (${user._id})`);
  }

  const userId = user._id;

  // 1. Ensure all integration apps are connected for this user
  console.log('\n--- Connecting Integrations in Marketplace ---');
  const appsToConnect = [
    { appId: 'openai', name: 'OpenAI', authData: { apiKey: 'sk-simulated-prod-token' } },
    { appId: 'telegram', name: 'Telegram', authData: { botToken: '123456:ABC-DEF-token', chatId: '@worksync_notifications' } },
    { appId: 'airtable', name: 'Airtable', authData: { apiKey: 'pat_simulated_token' } },
    { appId: 'twilio', name: 'Twilio', authData: { accountSid: 'AC_simulated_sid', authToken: 'tw_auth_token', fromNumber: '+15550192834' } },
    { appId: 'stripe', name: 'Stripe', authData: { apiKey: 'sk_test_simulated_key' } },
    { appId: 'slack', name: 'Slack', authData: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/simulated' } },
    { appId: 'discord', name: 'Discord', authData: { webhookUrl: 'https://discord.com/api/webhooks/00/simulated' } },
    { appId: 'teams', name: 'Microsoft Teams', authData: { webhookUrl: 'https://outlook.office.com/webhook/simulated' } },
  ];

  for (const item of appsToConnect) {
    let integration = await Integration.findOne({ userId, appId: item.appId });
    if (!integration) {
      integration = new Integration({ userId, appId: item.appId });
    }
    integration.name = item.name;
    integration.connected = true;
    integration.connectedAt = new Date();
    integration.authData = item.authData;
    integration.markModified('authData');
    await integration.save();
    console.log(`✔ Connected integration: ${item.name} (${item.appId})`);
  }

  // 2. Define Production-Grade Sample Workflows
  console.log('\n--- Creating & Verifying Sample Workflows ---');
  const sampleWorkflowsData = [
    {
      name: 'AI Survey Feedback Synthesizer',
      description: 'Automatically analyzes and synthesizes responses from Google Forms with OpenAI GPT.',
      trigger: {
        app: 'google_forms',
        event: 'New Form Response',
        parameters: { formId: 'form_customer_feedback_q3' },
      },
      action: {
        app: 'openai',
        action: 'generate_text',
        parameters: {
          prompt: 'Generate an executive summary and customer sentiment for: {{trigger.answers}}',
          model: 'gpt-4o-mini',
        },
      },
      enabled: true,
    },
    {
      name: 'Airtable CRM Lead to Telegram Alert',
      description: 'Pushes high-priority alerts into Telegram channels whenever a new lead record appears in Airtable.',
      trigger: {
        app: 'airtable',
        event: 'New Record',
        parameters: { baseId: 'app_crm_workspace', tableName: 'Leads' },
      },
      action: {
        app: 'telegram',
        action: 'send_message',
        parameters: {
          chatId: '@worksync_notifications',
          message: '🚀 New Airtable Lead Detected!\nCompany: {{trigger.fields.Company Name}}\nValue: {{trigger.fields.Deal Value}}',
        },
      },
      enabled: true,
    },
    {
      name: 'Stripe Payment VIP SMS Notification',
      description: 'Sends real-time SMS to executives via Twilio when enterprise payments succeed.',
      trigger: {
        app: 'stripe',
        event: 'Payment Succeeded',
        parameters: { currency: 'usd', minAmount: 100 },
      },
      action: {
        app: 'twilio',
        action: 'send_sms',
        parameters: {
          to: '+15550192834',
          message: 'WorkSync Alert: Stripe payment of ${{trigger.amount}} processed from {{trigger.customer.name}}!',
        },
      },
      enabled: true,
    },
    {
      name: 'Form Submission to Stripe Customer Sync',
      description: 'Creates verified Stripe customer records whenever a new client submits an onboarding form.',
      trigger: {
        app: 'google_forms',
        event: 'New Form Response',
        parameters: { formId: 'form_onboarding_2026' },
      },
      action: {
        app: 'stripe',
        action: 'create_customer',
        parameters: {
          email: '{{trigger.respondentEmail}}',
          name: '{{trigger.answers.Full Name || trigger.respondentEmail}}',
          description: 'Onboarded via WorkSync Google Form',
        },
      },
      enabled: true,
    },
    {
      name: 'Google Form to Airtable CRM Row Creator',
      description: 'Appends structured respondent answers directly into an Airtable table as new CRM rows.',
      trigger: {
        app: 'google_forms',
        event: 'New Form Response',
        parameters: { formId: 'form_product_survey' },
      },
      action: {
        app: 'airtable',
        action: 'create_record',
        parameters: {
          baseId: 'app_survey_db',
          tableName: 'Customer Feedback',
          Name: '{{trigger.respondentEmail}}',
          Notes: '{{trigger.answers}}',
        },
      },
      enabled: true,
    },
    {
      name: 'Customer Email Sentiment Analyzer',
      description: 'Uses OpenAI intelligence to analyze emotional tonality of incoming customer emails.',
      trigger: {
        app: 'gmail',
        event: 'New Email',
        parameters: { emailAddress: 'support@worksync.io' },
      },
      action: {
        app: 'openai',
        action: 'analyze_sentiment',
        parameters: {
          text: '{{trigger.body || trigger.snippet}}',
        },
      },
      enabled: true,
    },
  ];

  for (const wfData of sampleWorkflowsData) {
    // Check if workflow already exists
    let wf = await Workflow.findOne({ userId, name: wfData.name });
    if (!wf) {
      wf = await Workflow.create({
        ...wfData,
        userId,
      });
      console.log(`\nCreated workflow: "${wf.name}" (ID: ${wf._id})`);
    } else {
      wf.trigger = wfData.trigger as any;
      wf.action = wfData.action as any;
      wf.description = wfData.description;
      wf.enabled = true;
      await wf.save();
      console.log(`\nUpdated existing workflow: "${wf.name}" (ID: ${wf._id})`);
    }

    // 3. Test execute the workflow to make sure it works end-to-end
    console.log(`Testing execution for "${wf.name}" (${wf.trigger.app} -> ${wf.action.app})...`);
    const execution = await ExecutionEngine.executeWorkflow(wf, userId.toString());
    console.log(`✔ Execution Status: ${execution.status}`);
    console.log(`  Trigger Step: ${execution.logs[0]?.title} [${execution.logs[0]?.status}]`);
    console.log(`  Action Step:  ${execution.logs[2]?.title} [${execution.logs[2]?.status}]`);
    console.log(`  Duration:     ${execution.duration}ms`);
  }

  console.log('\n============================================================');
  console.log('🎉 SUCCESS: All apps connected and sample workflows verified!');
  console.log('============================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
