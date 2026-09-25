/**
 * The letter a memory without a photograph wears in place of one: the initial
 * of the first word that starts with a letter, so "5 meetup" reads M and
 * "3rd Date" reads D rather than a numeral. Null when no word qualifies (a title
 * of only numbers or emoji), and the caller draws its own mark instead.
 */
export function memoryInitial(title: string): string | null {
  for (const word of title.trim().split(/\s+/)) {
    const first = word.match(/^\p{L}/u)?.[0];
    if (first) return first.toLocaleUpperCase();
  }
  return null;
}
