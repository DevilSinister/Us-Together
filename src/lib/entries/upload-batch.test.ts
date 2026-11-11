import { describe, expect, it, vi } from "vitest";
import { heldAllocation, prepareAllocation, uploadQueuedFile, type UploadAllocation } from "./upload-batch";

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

describe("an upload service older or newer than the page", () => {
  const key = "11111111-1111-4111-8111-111111111111", theirs = "22222222-2222-4222-8222-222222222222";
  const soon = () => new Date(Date.now() + 3600000).toISOString(), past = () => new Date(Date.now() - 1000).toISOString();

  it("asks a current service again so it can renew and reconcile the same row", () => {
    expect(heldAllocation(key, undefined)).toBe("ask");
    expect(heldAllocation(key, { id: key, path: "p", uploaded: false, expiresAt: past() })).toBe("ask");
  });

  it("keeps a row an older service assigned while its window lasts, then replaces it", () => {
    expect(heldAllocation(key, { id: theirs, path: "p", uploaded: false, expiresAt: soon() })).toBe("keep");
    expect(heldAllocation(key, { id: theirs, path: "p", uploaded: true, expiresAt: past() })).toBe("keep");
    expect(heldAllocation(key, { id: theirs, path: "p", uploaded: false, expiresAt: past() })).toBe("replace");
    expect(heldAllocation(key, { id: theirs, path: "p", uploaded: false })).toBe("replace");
  });

  it("accepts the ID an older service assigns instead of refusing the upload", async () => {
    const ask = vi.fn(async () => ({ id: theirs, path: "couple/entry/" + theirs + "/original", expiresAt: soon() }));
    const release = vi.fn(async () => {});
    const first = await prepareAllocation(key, undefined, ask, release);
    expect(first).toMatchObject({ id: theirs, uploaded: false });
    // A retry of the same file must not reserve a second row on that service.
    const again = await prepareAllocation(key, { ...first, uploadUrl: "https://storage.test/upload/1" }, ask, release);
    expect(again).toMatchObject({ id: theirs, uploadUrl: "https://storage.test/upload/1" });
    expect(ask).toHaveBeenCalledTimes(1); expect(release).not.toHaveBeenCalled();
  });

  it("hands back an expired row from an older service before reserving a fresh one", async () => {
    const fresh = "33333333-3333-4333-8333-333333333333";
    const ask = vi.fn(async () => ({ id: fresh, path: "couple/entry/" + fresh + "/original", expiresAt: soon() }));
    const release = vi.fn(async () => { throw Error("Media unavailable."); });
    const next = await prepareAllocation(key, { id: theirs, path: "p", uploaded: false, expiresAt: past() }, ask, release);
    expect(release).toHaveBeenCalledWith(theirs); expect(next.id).toBe(fresh);
  });

  it("always asks a current service, which answers with the page's own ID and what it already stored", async () => {
    const ask = vi.fn(async () => ({ id: key, path: "p", uploaded: true, expiresAt: soon() }));
    const release = vi.fn(async () => {});
    expect(await prepareAllocation(key, { id: key, path: "p", uploaded: false, expiresAt: soon() }, ask, release)).toMatchObject({ id: key, uploaded: true });
    expect(ask).toHaveBeenCalledTimes(1); expect(release).not.toHaveBeenCalled();
  });

  it("defers, rather than fails, a file whose reservation came back incomplete", async () => {
    await expect(prepareAllocation(key, undefined, async () => ({}), async () => {})).rejects.toMatchObject({ recoverable: true });
  });
});
