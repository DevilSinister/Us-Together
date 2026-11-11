import { UploadOperationError } from "./upload-errors";

export type UploadAllocation = { id: string; path: string; uploaded: boolean; uploadUrl?: string; expiresAt?: string };

/**
 * What to do with the row a file already holds before asking for one again.
 *
 * The web app and the media service are released separately, so the page can
 * be talking to an older service. A current service keeps the request ID the
 * page chose, and asking again is how it renews and reconciles that same row.
 * An older one assigns its own ID and would reserve a new row on every ask, so
 * its row is kept for as long as its upload window lasts and handed back once
 * the window has closed.
 */
export function heldAllocation(key: string, held: UploadAllocation | undefined, now = Date.now()): "ask" | "keep" | "replace" {
  if (!held || held.id === key) return "ask";
  if (held.uploaded) return "keep";
  const expires = held.expiresAt ? Date.parse(held.expiresAt) : NaN;
  return expires > now + 60000 ? "keep" : "replace";
}

/**
 * Reserve, renew or reuse the row for one file, whichever service version answers.
 * `ask` requests a row under the file's own key; `release` hands a dead row back.
 */
export async function prepareAllocation(
  key: string,
  held: UploadAllocation | undefined,
  ask: () => Promise<{ id?: string; path?: string; uploaded?: boolean; expiresAt?: string }>,
  release: (id: string) => Promise<unknown>,
): Promise<UploadAllocation> {
  const plan = heldAllocation(key, held);
  if (held && plan === "keep") return held;
  // Releasing is best effort: an abandoned row is also swept when the entry is next opened.
  if (held && plan === "replace") await release(held.id).catch(() => {});
  const result = await ask();
  if (!result.id || !result.path) throw new UploadOperationError("The upload service gave an incomplete answer. This file will try again by itself.", true);
  return { id: result.id, path: result.path, expiresAt: result.expiresAt, uploaded: result.uploaded ?? false };
}

/** A retry finishes the same authorized row instead of allocating duplicate originals. */
export async function uploadQueuedFile<T extends { key: string }>(
  item: T,
  allocations: Map<string, UploadAllocation>,
  operations: {
    prepare: () => Promise<{ id: string; path: string }>;
    upload: (allocation: UploadAllocation) => Promise<void>;
    finalize: (allocation: UploadAllocation) => Promise<void>;
    checkpoint?: (allocation: UploadAllocation) => Promise<void>;
  },
) {
  let allocation = allocations.get(item.key);
  if (!allocation) {
    allocation = { ...await operations.prepare(), uploaded: false };
    allocations.set(item.key, allocation);
    await operations.checkpoint?.(allocation);
  }
  if (!allocation.uploaded) {
    await operations.upload(allocation);
    allocation.uploaded = true;
    await operations.checkpoint?.(allocation);
  }
  await operations.finalize(allocation);
  allocations.delete(item.key);
}
