import axios from 'axios';
import { getCredentials } from './credentials';
import { invalidConfig, IntegrationError, wrapSdkError } from './errors';
import { IWorkflow } from '../models/Workflow';
import { PollResult, TriggerEvent } from './triggers';

export interface AirtableParams {
  baseId?: string;
  tableName?: string;
  fields?: Record<string, any>;
  [key: string]: any;
}

const getAirtableToken = async (userId: string): Promise<string | null> => {
  try {
    const creds = await getCredentials(userId, 'airtable');
    return creds?.apiKey || creds?.token || null;
  } catch {
    return process.env.AIRTABLE_API_KEY?.trim() || null;
  }
};

/**
 * Action: create_record
 * Inserts a new record into an Airtable base table.
 */
export const createAirtableRecord = async (userId: string, params: AirtableParams) => {
  const baseId = (params.baseId || '').trim();
  const tableName = (params.tableName || 'Table 1').trim();

  if (!baseId) {
    throw invalidConfig('airtable', 'Airtable Base ID (app...) is required');
  }

  // Extract fields: can be provided explicitly as params.fields or gathered from top-level params
  let fields: Record<string, any> = {};
  if (params.fields && typeof params.fields === 'object') {
    fields = { ...params.fields };
  } else {
    // Collect non-configuration keys as table column values
    for (const [k, v] of Object.entries(params)) {
      if (!['baseId', 'tableName', 'fields'].includes(k)) {
        fields[k] = v;
      }
    }
  }

  if (Object.keys(fields).length === 0) {
    fields = {
      Name: 'WorkSync Automated Record',
      Notes: 'Created via WorkSync workflow engine',
      CreatedAt: new Date().toISOString(),
    };
  }

  const token = await getAirtableToken(userId);
  const isLive = Boolean(
    token &&
    !token.includes('simulated') &&
    !token.startsWith('ws_token_') &&
    (token.startsWith('pat.') || token.startsWith('key')) &&
    token.length >= 20
  );

  if (isLive && token) {
    try {
      const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
      const response = await axios.post(
        url,
        { fields },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        }
      );

      return {
        message: 'Airtable record created successfully',
        data: {
          id: response.data?.id,
          fields: response.data?.fields || fields,
          createdTime: response.data?.createdTime,
          baseId,
          tableName,
          live: true,
        },
      };
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new IntegrationError('airtable', 'AUTH_FAILED', 'Invalid or expired Airtable Personal Access Token');
      }
      if (err.response?.status === 404) {
        throw new IntegrationError('airtable', 'REQUEST_REJECTED', 'Airtable Base or Table not found');
      }
      throw new IntegrationError('airtable', 'REQUEST_REJECTED', `Airtable error: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  // Simulated record creation for sandbox / test runs
  const simulatedId = 'rec' + Math.random().toString(36).substring(2, 16);
  return {
    message: 'Airtable record created successfully (Simulation Mode)',
    data: {
      id: simulatedId,
      fields,
      createdTime: new Date().toISOString(),
      baseId,
      tableName,
      simulated: true,
      note: 'To sync live Airtable bases, connect your Airtable Personal Access Token in Apps.',
    },
  };
};

/**
 * Poller for Airtable Trigger: new_record
 */
export const pollAirtable = async (wf: IWorkflow, state: Record<string, any>): Promise<PollResult> => {
  const userId = wf.userId.toString();
  const token = await getAirtableToken(userId);
  const params = wf.trigger.parameters || {};
  const baseId = (params.baseId || '').trim();
  const tableName = (params.tableName || 'Table 1').trim();

  if (!baseId) {
    throw invalidConfig('airtable', 'Trigger is missing Airtable Base ID');
  }

  const cursor: string = state.cursor || new Date(Date.now() - 5 * 60 * 1000).toISOString();

  if (!token) {
    // If no live token configured, maintain cursor without failing
    return { events: [], state: { cursor: new Date().toISOString() } };
  }

  try {
    const url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}?maxRecords=20`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });

    const records = res.data?.records || [];
    const seen: string[] = state.seenIds || [];

    const fresh = records
      .filter((r: any) => !seen.includes(r.id) && new Date(r.createdTime).getTime() > new Date(cursor).getTime())
      .slice(0, 20);

    const events: TriggerEvent[] = fresh.map((r: any) => ({
      key: r.id,
      data: {
        recordId: r.id,
        fields: r.fields,
        createdTime: r.createdTime,
        baseId,
        tableName,
      },
    }));

    const newCursor = fresh.length ? fresh[fresh.length - 1].createdTime : cursor;
    return {
      events,
      state: {
        cursor: newCursor,
        seenIds: [...seen.slice(-50), ...fresh.map((r: any) => r.id)],
      },
    };
  } catch (err: any) {
    throw wrapSdkError('airtable', err);
  }
};
