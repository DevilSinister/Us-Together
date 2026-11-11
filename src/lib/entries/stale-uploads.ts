import type { EntryMedia } from "./types";

/** How long past its upload window a row must be before it is treated as abandoned. */
const GRACE = 60 * 60 * 1000;

/**
 * Rows this person reserved that can no longer receive a file.
 *
 * A reserved row counts toward the entry's 30-file and 300 MB limits whether
 * or not its file ever arrived. A row whose upload window closed more than an
 * hour ago, and which no file on this device is still sending to, is either a
 * finished transfer waiting to be published or an empty reservation. Neither
 * should be left for the person to clear by hand, one tile at a time.
 */
export function staleUploads(media: readonly EntryMedia[], inFlight: ReadonlySet<string>, now = Date.now()): EntryMedia[] {
  return media.filter(file => file.mine !== false && (file.state === "pending" || file.state === "failed") && !inFlight.has(file.id)
    && !!file.upload_expires_at && Date.parse(file.upload_expires_at) + GRACE <= now);
}

/** `retryable` marks a temporary refusal: throttling, or a service that did not answer. */
export type StaleOutcome = { error?: string; retryable?: boolean };

/**
 * Publish the rows whose file did arrive and release the ones whose file never did.
 *
 * Finishing is the only question the service answers about a stored original,
 * so each row is asked to finish once. Only its specific "has not finished"
 * answer releases a row. A temporary refusal stops the pass for a later visit,
 * and any other refusal leaves the tile for the person to decide.
 */
export async function settleStaleUploads(rows: readonly EntryMedia[], run: (operation: "finalize" | "remove", id: string) => Promise<StaleOutcome>): Promise<{ published: number; released: number }> {
  let published = 0, released = 0;
  for (const row of rows) {
    const finished = await run("finalize", row.id);
    if (!finished.error) { published++; continue; }
    if (finished.error.startsWith("Upload has not finished")) {
      const removed = await run("remove", row.id);
      if (!removed.error) released++;
      else if (removed.retryable) break;
      continue;
    }
    if (finished.retryable) break;
  }
  return { published, released };
}
