const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * A short, human phrase for how long ago something happened. Server components render
 * it inside `<time dateTime=… title=…>` so the exact instant stays one hover away.
 * Future instants (clock skew) read as "just now" rather than as a negative count.
 */
export function relativeTime(iso: string, now?: number, timeZone?: string) {
  now ??= Date.now();
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const elapsed = now - then;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 2 * DAY) return "yesterday";
  if (elapsed < 7 * DAY) return new Intl.DateTimeFormat("en", { weekday: "long", timeZone }).format(then);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(then);
}

/**
 * The full instant, for `title` attributes and detail pages. Server callers
 * pass the reader's zone: the host's own clock is UTC.
 */
export function absoluteTime(iso: string, timeZone?: string) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short", timeZone }).format(then);
}
