/**
 * Month buckets for the memories index.
 *
 * The index used to head every distinct day, so a day holding one memory cost a
 * heading, a rule and a row for a single line of content. The date now sits on
 * the row itself, and the headings coarsen to months, which keeps a long list
 * navigable without spending three elements on one memory.
 *
 * Runs are consecutive rather than collated, matching the newest-first order the
 * query already returns.
 */

const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

export function groupByMonth<T extends { memory_date: string }>(
  memories: T[],
): { key: string; label: string; memories: T[] }[] {
  const groups: { key: string; label: string; memories: T[] }[] = [];
  for (const memory of memories) {
    const key = memory.memory_date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === key) last.memories.push(memory);
    else groups.push({ key, label: monthLabel.format(new Date(key + "-01T00:00:00Z")), memories: [memory] });
  }
  return groups;
}
