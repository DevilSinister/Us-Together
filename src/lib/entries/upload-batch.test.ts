import { describe, expect, it, vi } from "vitest";
import { runUploadBatch, uploadQueuedFile, type UploadAllocation } from "./upload-batch";

describe("multi-file uploads", () => {
  it("uploads and finalizes all 30 files sequentially", async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ key: String(i), caption: "Caption " + i }));
    const allocations = new Map<string, UploadAllocation>();
    const calls: string[] = [];
    const result = await runUploadBatch(items, item => uploadQueuedFile(item, allocations, {
      prepare: async () => { calls.push("prepare " + item.key); return { id: item.key, path: "private/" + item.key }; },
      upload: async () => { calls.push("upload " + item.key); },
      finalize: async () => { calls.push("finalize " + item.key); },
    }), () => false);
    expect(result.remaining).toEqual([]);
    expect(result.failed).toBe(0);
    expect(calls).toEqual(items.flatMap(item => ["prepare " + item.key, "upload " + item.key, "finalize " + item.key]));
    expect(allocations.size).toBe(0);
  });

  it("continues after a processing error and retries only that existing upload", async () => {
    const items = [{ key: "first", caption: "Keep me" }, { key: "second", caption: "Also keep me" }];
    const allocations = new Map<string, UploadAllocation>();
    const prepare = vi.fn(async () => ({ id: "allocated", path: "private/original" }));
    const upload = vi.fn(async () => {});
    const finalize = vi.fn().mockRejectedValueOnce(Error("Decoder unavailable")).mockResolvedValue(undefined);
    const process = (item: typeof items[number]) => uploadQueuedFile(item, allocations, { prepare, upload, finalize });
    const first = await runUploadBatch(items, process, () => false);
    expect(first.remaining).toEqual([items[0]]);
    expect(first.failed).toBe(1);
    const retry = await runUploadBatch(first.remaining, process, () => false);
    expect(retry.remaining).toEqual([]);
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(finalize).toHaveBeenCalledTimes(3);
    expect(allocations.size).toBe(0);
  });

  it("reuses an allocation after a transfer failure without finalizing missing bytes", async () => {
    const allocations = new Map<string, UploadAllocation>();
    const prepare = vi.fn(async () => ({ id: "allocated", path: "private/original" }));
    const upload = vi.fn().mockRejectedValueOnce(Error("Connection lost")).mockResolvedValue(undefined);
    const finalize = vi.fn(async () => {});
    const item = { key: "one" };
    await expect(uploadQueuedFile(item, allocations, { prepare, upload, finalize })).rejects.toThrow("Connection lost");
    expect(finalize).not.toHaveBeenCalled();
    await uploadQueuedFile(item, allocations, { prepare, upload, finalize });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("stops a cancelled batch and preserves the current and remaining files", async () => {
    let cancelled = false;
    const process = vi.fn(async (item: number) => {
      if (item === 2) { cancelled = true; throw Error("Upload stopped"); }
    });
    const result = await runUploadBatch([1, 2, 3], process, () => cancelled);
    expect(result.remaining).toEqual([2, 3]);
    expect(result.cancelled).toBe(true);
    expect(process).toHaveBeenCalledTimes(2);
  });
});
