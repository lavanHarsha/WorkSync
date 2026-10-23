/**
 * The UI sends human labels ("Send Email"), the catalog uses ids ("send_email").
 * Normalise both to the id form so either works.
 */
export const normalizeActionId = (action: string): string =>
  String(action || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Same idea for trigger events ("New Email" -> "new_email"). */
export const normalizeEventId = normalizeActionId;
