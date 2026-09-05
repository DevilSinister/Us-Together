export const storyPageSize = 25;

export type StoryKind = "milestone" | "memory" | "plan" | "bucket";

export type StoryEntry = {
  kind: StoryKind;
  id: string;
  couple_id: string;
  occurred_on: string;
  title: string;
  location: string | null;
  source_bucket_item_id: string | null;
  source_plan_id: string | null;
};

export type StoryCursor = { occurredOn: string; id: string };

export type StoryView = {
  paired: boolean;
  entries: StoryEntry[];
  next: StoryCursor | null;
  error?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: StoryCursor): string {
  return `${cursor.occurredOn}|${cursor.id}`;
}

/**
 * A cursor arrives from the query string, and its parts are interpolated into a
 * PostgREST `or` filter. Both halves are therefore validated against an exact shape
 * rather than merely being non-empty: anything else returns null and the page starts
 * from the top instead of forwarding an attacker-chosen string into the filter.
 */
export function decodeCursor(value: string | null | undefined): StoryCursor | null {
  if (!value) return null;
  const [occurredOn, id, ...rest] = value.split("|");
  if (rest.length || !occurredOn || !id) return null;
  if (!datePattern.test(occurredOn) || Number.isNaN(Date.parse(`${occurredOn}T00:00:00Z`))) return null;
  if (!uuidPattern.test(id)) return null;
  return { occurredOn, id };
}

/** Groups a page by calendar year for the timeline's year headings. */
export function groupByYear(entries: StoryEntry[]): Array<{ year: string; entries: StoryEntry[] }> {
  const groups: Array<{ year: string; entries: StoryEntry[] }> = [];
  for (const entry of entries) {
    const year = entry.occurred_on.slice(0, 4);
    const current = groups.at(-1);
    if (current?.year === year) current.entries.push(entry);
    else groups.push({ year, entries: [entry] });
  }
  return groups;
}
