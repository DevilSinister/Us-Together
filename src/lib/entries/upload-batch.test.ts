import { describe, expect, it, vi } from "vitest";
import { uploadQueuedFile, type UploadAllocation } from "./upload-batch";

describe("one queued file", () => {
  it("prepares, transfers and finalizes each of 30 files in order", async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ key: String(i) }));
    const allocations = new Map<string, UploadAllocation>();
    const calls: string[] = [];
    for (const item of items) await uploadQueuedFile(item, allocations, {
      prepare: async () => { calls.push("prepare " + item.key); return { id: item.key, path: "private/" + item.key }; },
      upload: async () => { calls.push("upload " + item.key); },
      finalize: async () => { calls.push("finalize " + item.key); },
    });
    expect(calls).toEqual(items.flatMap(item => ["prepare " + item.key, "upload " + item.key, "finalize " + item.key]));
    expect(allocations.size).toBe(0);
  });

  it("retries a processing failure on the same stored original", async () => {
    const allocations = new Map<string, UploadAllocation>();
    const prepare = vi.fn(async () => ({ id: "allocated", path: "private/original" }));
    const upload = vi.fn(async () => {});
    const finalize = vi.fn().mockRejectedValueOnce(Error("Decoder unavailable")).mockResolvedValue(undefined);
    const item = { key: "first" };
    await expect(uploadQueuedFile(item, allocations, { prepare, upload, finalize })).rejects.toThrow("Decoder unavailable");
    expect(allocations.get("first")).toMatchObject({ id: "allocated", uploaded: true });
    await uploadQueuedFile(item, allocations, { prepare, upload, finalize });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledTimes(2);
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
});
