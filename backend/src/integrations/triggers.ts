import { google } from 'googleapis';
import { Octokit } from '@octokit/rest';
import { Client as NotionClient } from '@notionhq/client';
import { IWorkflow } from '../models/Workflow';
import { getCredentials } from './credentials';
import { googleClientForRefreshToken } from './google';
import { invalidConfig, wrapSdkError } from './errors';
import { normalizeEventId } from './actionId';

/** One new thing that happened in the external app. `key` makes enqueueing idempotent. */
export interface TriggerEvent {
  key: string;
  data: Record<string, any>;
}

export interface PollResult {
  events: TriggerEvent[];
  /** Persisted cursor so the next poll only sees newer items. */
  state: Record<string, any>;
}

export const POLLED_APPS = ['gmail', 'google_sheets', 'google_forms', 'github', 'notion'] as const;
export const isPolledApp = (app: string): boolean => (POLLED_APPS as readonly string[]).includes(app);

const MAX_EVENTS_PER_POLL = 20;
const REPO = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const lastN = <T>(arr: T[], n: number): T[] => arr.slice(Math.max(arr.length - n, 0));

/* ------------------------------------------------------------------ Gmail */

const decodeB64Url = (data?: string | null): string =>
  data ? Buffer.from(data, 'base64url').toString('utf8') : '';

const extractText = (payload: any): string => {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) return decodeB64Url(payload.body.data);
  for (const part of payload.parts || []) {
    const t = extractText(part);
    if (t) return t;
  }
  return '';
};

const header = (payload: any, name: string): string =>
  (payload?.headers || []).find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

const pollGmail = async (wf: IWorkflow, state: Record<string, any>): Promise<PollResult> => {
  const userId = wf.userId.toString();
  const creds = await getCredentials(userId, 'gmail');
  const auth = googleClientForRefreshToken('gmail', creds.refreshToken);
  const params = wf.trigger.parameters || {};

  const cursorMs: number | undefined = state.cursorMs;
  if (!cursorMs) return { events: [], state: { cursorMs: Date.now(), seenIds: [] } };

  const parts = [`after:${Math.floor(cursorMs / 1000)}`, 'in:inbox'];
  const from = str(params.emailAddress);
  if (from) parts.push(`from:${from.replace(/[\s()"]/g, '')}`);
  const subject = str(params.subjectFilter);
  if (subject) parts.push(`subject:(${subject.replace(/[()"]/g, ' ')})`);
  if (normalizeEventId(wf.trigger.event) === 'new_attachment') parts.push('has:attachment');

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const list = await gmail.users.messages.list(
      { userId: 'me', q: parts.join(' '), maxResults: MAX_EVENTS_PER_POLL },
      { retry: false }
    );
    const seen: string[] = state.seenIds || [];
    const events: (TriggerEvent & { ts: number })[] = [];

    for (const m of list.data.messages || []) {
      if (!m.id || seen.includes(m.id)) continue;
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' }, { retry: false });
      const ts = Number(full.data.internalDate || 0);
      if (ts <= cursorMs) continue;
      const p = full.data.payload;
      events.push({
        ts,
        key: m.id,
        data: {
          id: m.id,
          threadId: full.data.threadId,
          from: header(p, 'From'),
          sender: header(p, 'From'),
          to: header(p, 'To'),
          subject: header(p, 'Subject'),
          snippet: full.data.snippet || '',
          body: extractText(p).slice(0, 20000),
          receivedAt: new Date(ts).toISOString(),
        },
      });
    }

    events.sort((a, b) => a.ts - b.ts);
    const newCursor = events.length ? events[events.length - 1].ts : cursorMs;
    return {
      events: events.map(({ key, data }) => ({ key, data })),
      state: { cursorMs: newCursor, seenIds: lastN([...seen, ...events.map((e) => e.key)], 100) },
    };
  } catch (err) {
    throw wrapSdkError('gmail', err);
  }
};

/* ----------------------------------------------------------------- Sheets */

const pollSheets = async (wf: IWorkflow, state: Record<string, any>): Promise<PollResult> => {
  const userId = wf.userId.toString();
  const creds = await getCredentials(userId, 'google_sheets');
  const auth = googleClientForRefreshToken('google_sheets', creds.refreshToken);
  const params = wf.trigger.parameters || {};

  const spreadsheetId = str(params.spreadsheetId);
  if (!spreadsheetId) throw invalidConfig('google_sheets', 'Trigger is missing a Spreadsheet ID');
  const sheetName = str(params.sheetName) || 'Sheet1';

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get(
      { spreadsheetId, range: `'${sheetName.replace(/'/g, "''")}'!A:ZZ` },
      { retry: false }
    );
    const rows: any[][] = res.data.values || [];

    let rowCount: number | undefined = state.rowCount;
    if (rowCount === undefined || rowCount === null) return { events: [], state: { rowCount: rows.length } };
    if (rowCount > rows.length) rowCount = rows.length; // rows were deleted

    const headerRow = rows[0] || [];
    const fresh = rows.slice(rowCount, rowCount + MAX_EVENTS_PER_POLL);
    const events: TriggerEvent[] = fresh.map((row, i) => {
      const rowNumber = rowCount! + i + 1;
      const data: Record<string, any> = {};
      row.forEach((cell, c) => {
        data[String(headerRow[c] || `Column ${c + 1}`)] = cell;
      });
      return {
        key: `${spreadsheetId}-${sheetName}-${rowNumber}`,
        data: { spreadsheetId, sheetName, rowNumber, values: row, data, addedAt: new Date().toISOString() },
      };
    });
    return { events, state: { rowCount: rowCount + fresh.length } };
  } catch (err) {
    throw wrapSdkError('google_sheets', err);
  }
};

/* ------------------------------------------------------------------ Forms */

const pollForms = async (wf: IWorkflow, state: Record<string, any>): Promise<PollResult> => {
  const userId = wf.userId.toString();
  const creds = await getCredentials(userId, 'google_forms');
  const auth = googleClientForRefreshToken('google_forms', creds.refreshToken);
  const params = wf.trigger.parameters || {};

  const formId = str(params.formId);
  if (!formId) throw invalidConfig('google_forms', 'Trigger is missing a Form ID');

  const cursor: string | undefined = state.cursor;
  if (!cursor) return { events: [], state: { cursor: new Date().toISOString(), seenIds: [] } };

  try {
    const forms = google.forms({ version: 'v1', auth });
    const [form, list] = await Promise.all([
      forms.forms.get({ formId }, { retry: false }),
      forms.forms.responses.list({ formId, filter: `timestamp > ${cursor}`, pageSize: 50 }, { retry: false }),
    ]);

    const titles: Record<string, string> = {};
    for (const item of form.data.items || []) {
      const qid = item.questionItem?.question?.questionId;
      if (qid) titles[qid] = item.title || qid;
    }

    const seen: string[] = state.seenIds || [];
    const responses = (list.data.responses || [])
      .filter((r) => r.responseId && !seen.includes(r.responseId))
      .sort((a, b) => String(a.lastSubmittedTime).localeCompare(String(b.lastSubmittedTime)))
      .slice(0, MAX_EVENTS_PER_POLL);

    const events: TriggerEvent[] = responses.map((r) => {
      const answers: Record<string, string> = {};
      for (const [qid, a] of Object.entries(r.answers || {})) {
        answers[titles[qid] || qid] = (a.textAnswers?.answers || []).map((x) => x.value).join(', ');
      }
      return {
        key: r.responseId as string,
        data: {
          formId,
          responseId: r.responseId,
          respondentEmail: r.respondentEmail || '',
          answers,
          submittedAt: r.lastSubmittedTime || r.createTime,
        },
      };
    });

    const newCursor = responses.length
      ? String(responses[responses.length - 1].lastSubmittedTime || cursor)
      : cursor;
    return {
      events,
      state: { cursor: newCursor, seenIds: lastN([...seen, ...events.map((e) => e.key)], 100) },
    };
  } catch (err) {
    throw wrapSdkError('google_forms', err);
  }
};

/* ----------------------------------------------------------------- GitHub */

const pollGithub = async (wf: IWorkflow, state: Record<string, any>): Promise<PollResult> => {
  const userId = wf.userId.toString();
  const creds = await getCredentials(userId, 'github');
  if (typeof creds.accessToken !== 'string') {
    throw invalidConfig('github', 'Stored GitHub credentials are incomplete. Reconnect the app.');
  }
  const params = wf.trigger.parameters || {};
  const match = REPO.exec(str(params.repo));
  if (!match) throw invalidConfig('github', 'Trigger repo must be in "owner/name" format');
  const [, owner, repo] = match;

  const cursor: string | undefined = state.cursor;
  if (!cursor) return { events: [], state: { cursor: new Date().toISOString() } };

  const wantsPr = normalizeEventId(wf.trigger.event).includes('pull');
  try {
    const octokit = new Octokit({ auth: creds.accessToken, request: { timeout: 10_000 } });
    let items: any[];
    if (wantsPr) {
      const res = await octokit.rest.pulls.list({ owner, repo, state: 'all', sort: 'created', direction: 'desc', per_page: 30 });
      items = res.data;
    } else {
      const res = await octokit.rest.issues.listForRepo({
        owner, repo, state: 'all', sort: 'created', direction: 'desc', since: cursor, per_page: 30,
      });
      items = res.data.filter((i: any) => !i.pull_request);
    }

    const fresh = items
      .filter((i) => new Date(i.created_at).getTime() > new Date(cursor).getTime())
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, MAX_EVENTS_PER_POLL);

    const events: TriggerEvent[] = fresh.map((i) => ({
      key: `${owner}-${repo}-${wantsPr ? 'pr' : 'issue'}-${i.number}`,
      data: {
        repository: `${owner}/${repo}`,
        action: 'opened',
        number: i.number,
        title: i.title,
        body: i.body || '',
        author: i.user?.login,
        url: i.html_url,
        issue: { number: i.number, title: i.title, author: i.user?.login, url: i.html_url },
        created_at: i.created_at,
      },
    }));
    return { events, state: { cursor: fresh.length ? fresh[fresh.length - 1].created_at : cursor } };
  } catch (err) {
    throw wrapSdkError('github', err);
  }
};

/* ----------------------------------------------------------------- Notion */

const plainProp = (p: any): any => {
  switch (p?.type) {
    case 'title': return (p.title || []).map((t: any) => t.plain_text).join('');
    case 'rich_text': return (p.rich_text || []).map((t: any) => t.plain_text).join('');
    case 'number': return p.number;
    case 'select': return p.select?.name ?? null;
    case 'status': return p.status?.name ?? null;
    case 'multi_select': return (p.multi_select || []).map((s: any) => s.name);
    case 'checkbox': return p.checkbox;
    case 'date': return p.date?.start ?? null;
    case 'url': return p.url;
    case 'email': return p.email;
    case 'phone_number': return p.phone_number;
    default: return undefined;
  }
};

const pollNotion = async (wf: IWorkflow, state: Record<string, any>): Promise<PollResult> => {
  const userId = wf.userId.toString();
  const creds = await getCredentials(userId, 'notion');
  if (typeof creds.accessToken !== 'string') {
    throw invalidConfig('notion', 'Stored Notion credentials are incomplete. Reconnect the app.');
  }
  const params = wf.trigger.parameters || {};
  const databaseId = str(params.databaseId);
  if (!databaseId) throw invalidConfig('notion', 'Trigger is missing a Database ID');

  const cursor: string | undefined = state.cursor;
  if (!cursor) return { events: [], state: { cursor: new Date().toISOString() } };

  try {
    const notion = new NotionClient({ auth: creds.accessToken, timeoutMs: 10_000 });
    const res = await notion.databases.query({
      database_id: databaseId,
      filter: { timestamp: 'created_time', created_time: { after: cursor } },
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
      page_size: MAX_EVENTS_PER_POLL,
    });

    const events: TriggerEvent[] = res.results.map((page: any) => {
      const properties: Record<string, any> = {};
      let title = '';
      for (const [name, prop] of Object.entries<any>(page.properties || {})) {
        const v = plainProp(prop);
        if (v !== undefined) properties[name] = v;
        if (prop.type === 'title') title = v;
      }
      return {
        key: page.id,
        data: { databaseId, pageId: page.id, title, url: page.url, properties, createdAt: page.created_time },
      };
    });
    const last: any = res.results[res.results.length - 1];
    return { events, state: { cursor: last ? last.created_time : cursor } };
  } catch (err) {
    throw wrapSdkError('notion', err);
  }
};

/** Polls the external app for items newer than the stored cursor. First poll only records the cursor. */
export const pollTrigger = async (wf: IWorkflow): Promise<PollResult> => {
  const state = (wf.triggerState || {}) as Record<string, any>;
  switch (wf.trigger.app) {
    case 'gmail': return pollGmail(wf, state);
    case 'google_sheets': return pollSheets(wf, state);
    case 'google_forms': return pollForms(wf, state);
    case 'github': return pollGithub(wf, state);
    case 'notion': return pollNotion(wf, state);
    default: return { events: [], state };
  }
};
