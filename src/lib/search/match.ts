/**
 * Matching for search, done on the app server against rows the person can
 * already read. It never builds a database filter from what was typed, so the
 * search text stays out of every URL and database log.
 */

/** Lower-case, with accents folded, so "cafe" finds "Café". */
export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/**
 * 0 when the entry does not match. Every word typed must appear somewhere in
 * the title or the other fields. A title that starts with the query ranks
 * highest, then a title containing every word, then a match found elsewhere.
 */
export function matchScore(query: string, title: string, others: Array<string | null | undefined> = []) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const heading = normalize(title);
  const body = others.filter((value): value is string => Boolean(value)).map(normalize).join("\n");
  if (!terms.every((term) => heading.includes(term) || body.includes(term))) return 0;
  if (heading.startsWith(normalize(query))) return 3;
  if (terms.every((term) => heading.includes(term))) return 2;
  return 1;
}
