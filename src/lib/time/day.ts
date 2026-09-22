/**
 * Calendar-day grouping and separator labels, for threads that read as a chat.
 *
 * Distinct from `relative.ts` in this directory, which answers "how long ago"
 * from elapsed milliseconds. That is the right answer for a note or a drawing
 * and the wrong one here: elapsed time calls anything 24-48 hours old
 * "yesterday" even when it falls two calendar days back, and it cannot produce
 * the day key a separator needs.
 *
 * A comment's `created_at` is an instant; a day separator is a calendar fact,
 * and which day an instant lands on depends on the reader's zone. Everything
 * here therefore takes an explicit `timeZone` rather than leaning on the host's
 * — the couple may be in different zones, and the profile zone is the one the
 * rest of the app already uses.
 *
 * Day arithmetic runs on the `YYYY-MM-DD` key parsed at UTC midnight, never on
 * the original instant. Subtracting two instants breaks across a DST boundary,
 * where a calendar day is 23 or 25 hours long; subtracting two UTC midnights
 * cannot.
 */

const DAY_MS = 86_400_000;

/** The reader's zone: an explicit preference, else whatever the host resolves. */
export function resolveTimeZone(preferred?: string | null): string {
  if (preferred) return preferred;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** The calendar day an instant falls on, in the given zone, as `YYYY-MM-DD`. */
export function dayKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? "";
  return read("year") + "-" + read("month") + "-" + read("day");
}

/** Today's key in the given zone. */
export function todayKey(timeZone: string, now: Date = new Date()): string {
  return dayKey(now.toISOString(), timeZone);
}

/**
 * The separator label for a day key: Today, Yesterday, a weekday name inside
 * the last week, or the full date. Future days always take the full date — a
 * plain weekday name for something ahead of today reads as the past.
 */
export function dayLabel(key: string, today: string, locale = "en"): string {
  const elapsed = Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(key + "T00:00:00Z")) / DAY_MS);
  if (elapsed === 0) return "Today";
  if (elapsed === 1) return "Yesterday";
  if (elapsed > 1 && elapsed < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
      .format(new Date(key + "T00:00:00Z"));
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(key + "T00:00:00Z"));
}

/** The short time shown on a bubble, e.g. "2:14 PM". */
export function clockLabel(iso: string, timeZone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(new Date(iso));
}

/** The long form announced to assistive technology, never shown visually. */
export function fullLabel(iso: string, timeZone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone })
    .format(new Date(iso));
}

/**
 * Split a chronological list into calendar-day runs, preserving order.
 *
 * Runs are consecutive, not collated: a list already ordered by `created_at`
 * yields one group per day. Out-of-order input yields two groups for the same
 * day, which is the honest rendering of out-of-order input rather than a silent
 * re-sort.
 */
export function groupByDay<T extends { created_at: string }>(
  items: T[],
  timeZone: string,
): { key: string; items: T[] }[] {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.created_at, timeZone);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}
