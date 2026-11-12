/** What one moment has ready to show: how many photographs, how many files in all, and its first photograph. */
export type MomentMediaTally = { photos: number; files: number; cover: string | null };

/**
 * Counts a list of ready files by the moment they belong to. Rows arrive oldest
 * first, so each moment's `cover` is the first photograph added to it.
 */
export function tallyMomentMedia(rows: Array<{ id: string; milestone_id: string; media_type: string }>) {
  const byMoment = new Map<string, MomentMediaTally>();
  for (const row of rows) {
    const tally = byMoment.get(row.milestone_id) ?? { photos: 0, files: 0, cover: null };
    tally.files += 1;
    if (row.media_type === "image") {
      tally.photos += 1;
      tally.cover ??= row.id;
    }
    byMoment.set(row.milestone_id, tally);
  }
  return byMoment;
}

/** A moment's kind as the list shows it: "Anniversary", "Travel". A custom moment has no kind worth naming. */
export function momentKindLabel(type: string) {
  if (!type || type === "custom") return null;
  const words = type.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
