export type UploadAllocation = { id: string; path: string; uploaded: boolean };

/** A retry finishes the same authorized row instead of allocating duplicate originals. */
export async function uploadQueuedFile<T extends { key: string }>(
  item: T,
  allocations: Map<string, UploadAllocation>,
  operations: {
    prepare: () => Promise<{ id: string; path: string }>;
    upload: (allocation: UploadAllocation) => Promise<void>;
    finalize: (allocation: UploadAllocation) => Promise<void>;
  },
) {
  let allocation = allocations.get(item.key);
  if (!allocation) {
    allocation = { ...await operations.prepare(), uploaded: false };
    allocations.set(item.key, allocation);
  }
  if (!allocation.uploaded) {
    await operations.upload(allocation);
    allocation.uploaded = true;
  }
  await operations.finalize(allocation);
  allocations.delete(item.key);
}

/** Process files independently and keep failures selected with their captions. */
export async function runUploadBatch<T>(
  items: readonly T[],
  process: (item: T, index: number) => Promise<void>,
  isCancelled: () => boolean,
) {
  const remaining: T[] = [];
  let failed = 0;
  let firstError = "";
  for (let index = 0; index < items.length; index++) {
    if (isCancelled()) {
      remaining.push(...items.slice(index));
      break;
    }
    try { await process(items[index], index); }
    catch (error) {
      remaining.push(items[index]);
      if (isCancelled()) {
        remaining.push(...items.slice(index + 1));
        break;
      }
      failed++;
      firstError ||= error instanceof Error ? error.message : "Could not finish upload.";
    }
  }
  return { remaining, failed, firstError, cancelled: isCancelled() };
}
