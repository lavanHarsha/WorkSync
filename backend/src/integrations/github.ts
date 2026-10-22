import { Octokit } from '@octokit/rest';
import { getCredentials } from './credentials';
import { IntegrationError, invalidConfig, wrapSdkError } from './errors';

export interface GithubParams {
  repo?: string; // "owner/name"
  title?: string;
  body?: string;
  labels?: string[] | string;
}

const REPO = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

/** Opens an issue using the user's stored OAuth access token. */
export const createGithubIssue = async (userId: string, params: GithubParams) => {
  const creds = await getCredentials(userId, 'github');
  if (typeof creds.accessToken !== 'string') {
    throw invalidConfig('github', 'Stored GitHub credentials are incomplete. Reconnect the app.');
  }

  const match = REPO.exec((params.repo || '').toString().trim());
  if (!match) throw invalidConfig('github', 'repo must be in "owner/name" format');
  const title = params.title?.toString().trim();
  if (!title) throw invalidConfig('github', 'Issue title is required');

  const labels = Array.isArray(params.labels)
    ? params.labels
    : typeof params.labels === 'string'
      ? params.labels.split(',').map((l) => l.trim()).filter(Boolean)
      : undefined;

  try {
    const octokit = new Octokit({ auth: creds.accessToken, request: { timeout: 10_000 } });
    const res = await octokit.rest.issues.create({
      owner: match[1],
      repo: match[2],
      title,
      body: params.body?.toString(),
      labels,
    });
    return {
      message: 'GitHub issue created successfully',
      data: { repo: `${match[1]}/${match[2]}`, number: res.data.number, url: res.data.html_url },
    };
  } catch (err: any) {
    // GitHub reports exhausted primary/secondary rate limits as 403, which is retryable
    const headers = err?.response?.headers || {};
    if (err?.status === 403 && (headers['x-ratelimit-remaining'] === '0' || headers['retry-after'])) {
      const reset = Number(headers['x-ratelimit-reset']);
      const retryAfter = Number(headers['retry-after']);
      throw new IntegrationError('github', 'RATE_LIMITED', 'GitHub rate limit hit', {
        retryable: true,
        statusCode: 403,
        retryAfterMs: retryAfter > 0
          ? retryAfter * 1000
          : reset > 0 ? Math.max(reset * 1000 - Date.now(), 0) : undefined,
      });
    }
    throw wrapSdkError('github', err);
  }
};
