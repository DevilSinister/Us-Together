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

/**
 * A timeline row with what the page needs to tell it well: up to three photo
 * ids for a memory or moment, the first lines of its story, and which of you
 * kept it. Plans and finished dreams carry none of these.
 */
export type StoryItem = StoryEntry & {
  photos: string[];
  excerpt: string | null;
  author: "me" | "partner" | null;
};

export type StoryCounts = Record<StoryKind, number>;

/** How the story opens and ends: what it holds, and the day it began. */
export type StoryOverview = { counts: StoryCounts; startedOn: string | null };

export type StoryView = {
  paired: boolean;
  entries: StoryItem[];
  next: StoryCursor | null;
  overview?: StoryOverview;
  /** Set in the developer preview, whose photos live in this browser only. */
  previewSession?: string;
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
export function groupByYear<T extends StoryEntry>(entries: T[]): Array<{ year: string; entries: T[] }> {
  const groups: Array<{ year: string; entries: T[] }> = [];
  for (const entry of entries) {
    const year = entry.occurred_on.slice(0, 4);
    const current = groups.at(-1);
    if (current?.year === year) current.entries.push(entry);
    else groups.push({ year, entries: [entry] });
  }
  return groups;
}

const excerptLength = 180;

/** The first lines of a story, cut at a word, never mid-way through one. */
export function storyExcerpt(text: string | null | undefined): string | null {
  const flat = text?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  if (flat.length <= excerptLength) return flat;
  const cut = flat.slice(0, excerptLength);
  const space = cut.lastIndexOf(" ");
  return (space > excerptLength * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.!?-]+$/, "") + "…";
}

const counted: Array<[StoryKind, string, string]> = [
  ["memory", "memory", "memories"],
  ["milestone", "moment", "moments"],
  ["plan", "plan kept", "plans kept"],
  ["bucket", "dream lived", "dreams lived"],
];

/**
 * The story so far as one sentence - "12 memories, 4 moments and 2 dreams
 * lived" - rather than a row of metric tiles. Kinds with nothing yet are left
 * out instead of printed as zero.
 */
export function storySummary(counts: StoryCounts): string | null {
  const parts = counted
    .filter(([kind]) => counts[kind] > 0)
    .map(([kind, one, many]) => counts[kind].toLocaleString("en") + " " + (counts[kind] === 1 ? one : many));
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts.at(-1);
}

const ordinals = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/**
 * Each calendar year of the story is a chapter, counted from the year it
 * began. A year before the recorded start - an entry dated earlier than the
 * relationship - gets no chapter number rather than a zero or a negative.
 */
export function chapterLabel(year: string, startedOn: string | null | undefined): string | null {
  if (!startedOn || !datePattern.test(startedOn)) return null;
  const number = Number(year) - Number(startedOn.slice(0, 4)) + 1;
  if (!Number.isInteger(number) || number < 1) return null;
  return "Chapter " + (ordinals[number - 1] ?? String(number));
}
