/**
 * Opaque keyset cursors for newest-first lists ordered by (timestamp desc, id desc).
 *
 * The cursor is the last row's own sort key, base64url-encoded as `time|id`. Decoding
 * validates both halves strictly, so a tampered cursor degrades to "first page" rather
 * than reaching the database as a filter fragment.
 */
export type Cursor = { time: string; id: string };

// PostgREST renders timestamptz as ISO 8601 with a `+00:00` offset and omits the
// fraction entirely when it is zero, so the fractional part is optional here.
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(time: string, id: string) {
  return Buffer.from(time + "|" + id).toString("base64url");
}

export function decodeCursor(input: string | undefined): Cursor | null {
  if (!input || input.length > 200) return null;
  try {
    const [time, id, ...rest] = Buffer.from(input, "base64url").toString("utf8").split("|");
    if (rest.length || !time || !id) return null;
    if (!TIME.test(time) || !UUID.test(id) || Number.isNaN(Date.parse(time))) return null;
    return { time, id };
  } catch {
    return null;
  }
}

/** A PostgREST `.or()` fragment selecting rows strictly older than the cursor. */
export function keysetFilter(column: string, cursor: Cursor) {
  return `${column}.lt.${cursor.time},and(${column}.eq.${cursor.time},id.lt.${cursor.id})`;
}

/** A PostgREST `.or()` fragment selecting rows strictly newer than the cursor. */
export function keysetFilterAfter(column: string, cursor: Cursor) {
  return `${column}.gt.${cursor.time},and(${column}.eq.${cursor.time},id.gt.${cursor.id})`;
}
