import { google } from 'googleapis';
import { getCredentials } from './credentials';
import { googleClientForRefreshToken } from './google';
import { invalidConfig, wrapSdkError } from './errors';

export interface SheetsParams {
  spreadsheetId?: string;
  sheetName?: string;
  /** Array of cell values, or a JSON array string */
  values?: any;
  /** Alternative: object whose values become the row, in key order */
  row?: Record<string, any> | string;
}

const toCell = (v: any): string | number | boolean =>
  v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : v;

const resolveRow = (params: SheetsParams): any[] => {
  let source: any = params.values ?? params.row;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      throw invalidConfig('google_sheets', 'Row values must be a JSON array or object');
    }
  }
  if (Array.isArray(source)) return source.map(toCell);
  if (source && typeof source === 'object') return Object.values(source).map(toCell);
  throw invalidConfig('google_sheets', 'Row values are required (array or object)');
};

/** Appends one row to a sheet using the stored refresh token. */
export const appendSheetRow = async (userId: string, params: SheetsParams) => {
  const creds = await getCredentials(userId, 'google_sheets');
  const auth = googleClientForRefreshToken('google_sheets', creds.refreshToken);

  const spreadsheetId = params.spreadsheetId?.toString().trim();
  if (!spreadsheetId) throw invalidConfig('google_sheets', 'spreadsheetId is required');
  const sheetName = (params.sheetName || 'Sheet1').toString();
  const row = resolveRow(params);

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.append(
      {
        spreadsheetId,
        range: `'${sheetName.replace(/'/g, "''")}'!A1`,
        // RAW so user/webhook-supplied text can never be evaluated as a formula
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
      },
      { retry: false }
    );
    return {
      message: 'Row appended to Google Sheets successfully',
      data: {
        spreadsheetId,
        sheet: sheetName,
        updatedRange: res.data.updates?.updatedRange,
        rowsAdded: res.data.updates?.updatedRows ?? 1,
      },
    };
  } catch (err) {
    throw wrapSdkError('google_sheets', err);
  }
};
