import { Request, Response, NextFunction } from 'express';
import { Integration } from '../models/Integration';
import { AuthRequest } from '../middleware/auth';
import { IntegrationError } from '../integrations/errors';
import { assertHttpUrl } from '../integrations/http';
import { SLACK_HOST } from '../integrations/slack';
import { DISCORD_HOST } from '../integrations/discord';
import { TEAMS_HOST } from '../integrations/teams';
import {
  STATE_COOKIE,
  buildAuthUrl,
  createState,
  exchangeCode,
  isOAuthApp,
  verifyState,
} from '../integrations/oauth';

// Catalog of supported WorkSync apps and metadata
export const APP_CATALOG = [
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Communication',
    icon: 'Mail',
    color: '#EA4335',
    description: 'Trigger workflows from incoming emails and automatically send personalized emails.',
    triggers: [
      { id: 'new_email', name: 'New Email', description: 'Triggers when a new email arrives matching filters' },
      { id: 'new_attachment', name: 'New Attachment', description: 'Triggers when an email with attachment is received' },
    ],
    actions: [
      { id: 'send_email', name: 'Send Email', description: 'Sends an email to specified recipients' },
      { id: 'create_draft', name: 'Create Draft', description: 'Creates a draft email in your mailbox' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Team Chat',
    icon: 'MessageSquare',
    color: '#4A154B',
    description: 'Post automated notifications to public channels, private groups, or direct messages.',
    triggers: [
      { id: 'new_message', name: 'New Channel Message', description: 'Triggers when a new message is posted' },
      { id: 'new_mention', name: 'New Mention', description: 'Triggers when user is @mentioned' },
    ],
    actions: [
      { id: 'send_message', name: 'Send Channel Message', description: 'Posts formatted messages to selected channel' },
      { id: 'send_dm', name: 'Send Direct Message', description: 'Sends a private DM to a team member' },
    ],
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    category: 'Productivity',
    icon: 'Table',
    color: '#0F9D58',
    description: 'Read rows, insert records, and keep spreadsheets automatically synchronized.',
    triggers: [
      { id: 'new_row', name: 'New Spreadsheet Row', description: 'Triggers when a row is appended to a sheet' },
      { id: 'updated_row', name: 'Updated Spreadsheet Row', description: 'Triggers when values change in a sheet' },
    ],
    actions: [
      { id: 'add_row', name: 'Add Spreadsheet Row', description: 'Appends data as a new row in a sheet' },
      { id: 'update_row', name: 'Update Row', description: 'Finds and updates a matching row' },
    ],
  },
  {
    id: 'google_forms',
    name: 'Google Forms',
    category: 'Forms & Surveys',
    icon: 'FileText',
    color: '#7248B9',
    description: 'Trigger automated downstream actions whenever a respondent submits a form.',
    triggers: [
      { id: 'new_response', name: 'New Form Response', description: 'Triggers whenever someone submits your form' },
    ],
    actions: [],
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    category: 'Developer Tools',
    icon: 'Webhook',
    color: '#6366F1',
    description: 'Connect any custom application, API, Stripe, GitHub, or Shopify store with instant HTTP payloads.',
    triggers: [
      { id: 'catch_hook', name: 'Catch Webhook', description: 'Wait for incoming HTTP POST/GET requests' },
    ],
    actions: [
      { id: 'send_request', name: 'Custom HTTP Request', description: 'Send JSON payload to any REST endpoint' },
    ],
  },
  {
    id: 'schedule',
    name: 'Schedule by WorkSync',
    category: 'Automation',
    icon: 'Clock',
    color: '#0284C7',
    description: 'Run recurring workflows every minute, hour, day, week, or month like clockwork.',
    triggers: [
      { id: 'every_hour', name: 'Every Hour', description: 'Fires at the top of every hour' },
      { id: 'every_day', name: 'Every Day', description: 'Fires once a day at chosen time' },
      { id: 'every_week', name: 'Every Week', description: 'Fires on specified days of the week' },
    ],
    actions: [],
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'Community & Chat',
    icon: 'Headphones',
    color: '#5865F2',
    description: 'Send rich embed alerts, community notifications, and bot messages into Discord channels.',
    triggers: [
      { id: 'new_message', name: 'New Channel Message', description: 'Triggers when a message is sent in server' },
    ],
    actions: [
      { id: 'send_message', name: 'Send Channel Message', description: 'Posts message via Discord Webhook' },
    ],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'Communication',
    icon: 'Users',
    color: '#5059C9',
    description: 'Keep enterprise teams aligned by pushing alerts and cards directly into Microsoft Teams channels.',
    triggers: [],
    actions: [
      { id: 'send_message', name: 'Post Teams Message', description: 'Delivers notifications into Teams channel' },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    icon: 'BookOpen',
    color: '#000000',
    description: 'Create database pages, log tasks, and sync workspaces seamlessly with Notion databases.',
    triggers: [
      { id: 'new_page', name: 'New Database Item', description: 'Triggers when an entry is created in Notion DB' },
    ],
    actions: [
      { id: 'create_page', name: 'Create Database Page', description: 'Inserts a new page with custom properties' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Developer Tools',
    icon: 'GitBranch',
    color: '#24292F',
    description: 'Trigger automations on new pull requests, issues, releases, or commits.',
    triggers: [
      { id: 'new_issue', name: 'New Issue Opened', description: 'Triggers when an issue is logged in a repository' },
      { id: 'new_pr', name: 'New Pull Request', description: 'Triggers on PR open or merge' },
    ],
    actions: [
      { id: 'create_issue', name: 'Create Issue', description: 'Opens a new issue in a GitHub repository' },
    ],
  },
];

export const getApps = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Fetch user's connected integrations from database
    const userIntegrations = await Integration.find({ userId });
    const connectionMap = new Map(userIntegrations.map((i) => [i.appId, i.connected]));

    const apps = APP_CATALOG.map((app) => ({
      ...app,
      connected: connectionMap.get(app.id) ?? false,
    }));

    res.status(200).json({
      success: true,
      apps,
    });
  } catch (error) {
    next(error);
  }
};

const WEBHOOK_HOSTS: Record<string, RegExp> = {
  slack: SLACK_HOST,
  discord: DISCORD_HOST,
  teams: TEAMS_HOST,
};

const frontendBase = (): string =>
  (process.env.FRONTEND_URL || (process.env.CORS_ORIGINS || '').split(',')[0] || 'http://localhost:5173')
    .trim()
    .replace(/\/$/, '');

export const connectApp = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    const { authData } = req.body;

    const catalogApp = APP_CATALOG.find((a) => a.id === appId);
    if (!catalogApp) {
      res.status(404).json({ success: false, message: 'Application not supported' });
      return;
    }

    // These apps hold real credentials and can only be connected through the OAuth flow
    if (isOAuthApp(appId)) {
      res.status(400).json({
        success: false,
        message: `${catalogApp.name} uses OAuth. Start at GET /api/apps/${appId}/oauth/start`,
      });
      return;
    }

    let dataToStore = authData;
    if (WEBHOOK_HOSTS[appId]) {
      try {
        const url = assertHttpUrl(appId, authData?.webhookUrl, {
          hosts: WEBHOOK_HOSTS[appId],
          label: `${catalogApp.name} webhook URL`,
        });
        dataToStore = { webhookUrl: url.toString() }; // store nothing else
      } catch (err) {
        res.status(400).json({ success: false, message: (err as Error).message });
        return;
      }
    }

    // Use document.save() (not findOneAndUpdate) so the Integration pre-save hook encrypts authData
    const integration =
      (await Integration.findOne({ userId, appId })) || new Integration({ userId, appId });
    integration.name = catalogApp.name;
    integration.connected = true;
    integration.connectedAt = new Date();
    integration.authData = dataToStore || { simulatedAuth: true, connectedVia: 'OAuth 2.0 Mock Layer' };
    integration.markModified('authData');
    await integration.save();

    res.status(200).json({
      success: true,
      message: `Successfully connected ${catalogApp.name}`,
      integration,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/apps/:appId/oauth/start (authenticated)
 * Redirects to the provider consent screen. Browsers can't attach a Bearer header to a
 * navigation, so API clients should send `Accept: application/json` (or ?mode=json) to
 * receive { url } and then set window.location themselves.
 */
export const oauthStart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!isOAuthApp(appId)) {
      res.status(404).json({ success: false, message: 'This application does not use OAuth' });
      return;
    }

    const { state, nonce } = createState(String(req.user?.id), appId);
    let url: string;
    try {
      url = buildAuthUrl(appId, state);
    } catch (err) {
      if (err instanceof IntegrationError) {
        res.status(503).json({ success: false, message: err.message });
        return;
      }
      throw err;
    }

    // Binds the state to this browser (checked in the callback)
    res.cookie(STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // must survive the top-level redirect back from the provider
      path: '/api/apps',
      maxAge: 10 * 60 * 1000,
    });

    if (req.query.mode === 'json' || req.accepts(['html', 'json']) === 'json') {
      res.status(200).json({ success: true, url });
      return;
    }
    res.redirect(url);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/apps/:appId/oauth/callback (public: the provider redirects the browser here)
 * Identity comes from the signed state, not a bearer token. Always ends in a redirect to the SPA.
 */
export const oauthCallback = async (req: Request, res: Response): Promise<void> => {
  const { appId } = req.params;
  const back = (params: Record<string, string>) =>
    res.redirect(`${frontendBase()}/apps?${new URLSearchParams(params)}`);

  try {
    const catalogApp = APP_CATALOG.find((a) => a.id === appId);
    if (!catalogApp || !isOAuthApp(appId)) {
      back({ error: 'unsupported_app' });
      return;
    }

    if (typeof req.query.error === 'string') {
      back({ app: appId, error: 'access_denied' });
      return;
    }
    const { code, state } = req.query;
    if (typeof code !== 'string' || typeof state !== 'string') {
      back({ app: appId, error: 'invalid_callback' });
      return;
    }

    const { userId } = verifyState(state, appId, req.cookies?.[STATE_COOKIE]);
    res.clearCookie(STATE_COOKIE, { path: '/api/apps' });

    const credentials = await exchangeCode(appId, code);

    const integration =
      (await Integration.findOne({ userId, appId })) || new Integration({ userId, appId });
    integration.name = catalogApp.name;
    integration.connected = true;
    integration.connectedAt = new Date();
    integration.authData = credentials; // encrypted by the model's pre-save hook
    integration.markModified('authData');
    await integration.save();

    back({ app: appId, connected: 'true' });
  } catch (error) {
    // IntegrationError messages never contain credentials; anything else is reduced to a generic code
    back({
      app: appId,
      error: error instanceof IntegrationError ? error.message : 'oauth_failed',
    });
  }
};

export const disconnectApp = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;

    const integration = await Integration.findOneAndUpdate(
      { userId, appId },
      { connected: false, authData: {} }, // drop stored tokens/webhook URLs on disconnect
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Disconnected application`,
      integration,
    });
  } catch (error) {
    next(error);
  }
};
