export type UploadAllocation = { id: string; path: string; uploaded: boolean; uploadUrl?: string; expiresAt?: string };

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
