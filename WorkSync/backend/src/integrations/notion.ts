import { Client } from '@notionhq/client';
import { getCredentials } from './credentials';
import { invalidConfig, wrapSdkError } from './errors';

export interface NotionParams {
  databaseId?: string;
  title?: string;
  content?: string;
}

const chunk = (text: string, size = 2000): string[] => {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
};

/** Creates a page in a Notion database using the stored integration token. */
export const createNotionPage = async (userId: string, params: NotionParams) => {
  const creds = await getCredentials(userId, 'notion');
  if (typeof creds.accessToken !== 'string') {
    throw invalidConfig('notion', 'Stored Notion credentials are incomplete. Reconnect the app.');
  }

  const databaseId = params.databaseId?.toString().trim();
  if (!databaseId) throw invalidConfig('notion', 'databaseId is required');
  const title = params.title?.toString().trim();
  if (!title) throw invalidConfig('notion', 'Page title is required');

  try {
    const notion = new Client({ auth: creds.accessToken, timeoutMs: 10_000 });

    // The title property has a user-defined name, so look it up
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const titleProp = Object.entries(db.properties).find(([, p]: [string, any]) => p.type === 'title');
    if (!titleProp) throw invalidConfig('notion', 'Target database has no title property');

    const content = params.content?.toString().trim();
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        [titleProp[0]]: { title: [{ text: { content: title.slice(0, 2000) } }] },
      },
      children: content
        ? chunk(content).slice(0, 100).map((c) => ({
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: { rich_text: [{ type: 'text' as const, text: { content: c } }] },
          }))
        : undefined,
    });

    return {
      message: 'Notion database item created successfully',
      data: { databaseId, pageId: page.id, url: (page as any).url },
    };
  } catch (err) {
    throw wrapSdkError('notion', err);
  }
};
