import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadSession, type UploadOperations, type UploadSnapshot } from "./upload-session";
import { TransferCancelled, type Transfer } from "./media-transfer";
import { UploadOperationError } from "./upload-errors";
import type { UploadBatch, UploadJob, UploadStore } from "./upload-store";

const photo = (key: string) => ({ key, file: new File(["fixture"], key + ".png", { type: "image/png" }), mime: "image/png", caption: "" });
const copy = (job: UploadJob) => ({ ...job, allocation: job.allocation ? { ...job.allocation } : undefined });
const flush = async () => { for (let i = 0; i < 1000; i++) await Promise.resolve(); };
function fixture() {
  const disk = new Map<string, UploadJob>();
  let batch: UploadBatch = { paused: false, completed: 0, total: 0 };
  const store: UploadStore = {
    load: async () => ({ jobs: [...disk.values()].map(copy), batch: { ...batch } }),
    add: async (jobs, value) => { jobs.forEach(job => disk.set(job.key, copy(job))); batch = { ...value }; },
    save: async job => { disk.set(job.key, copy(job)); },
    batch: async value => { batch = { ...value }; },
    remove: async (key, value) => { disk.delete(key); batch = { ...value }; },
  };
  const completedTransfer = (): Transfer => ({ done: Promise.resolve(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), suspend: vi.fn() });
  const operations: UploadOperations = {
    prepare: vi.fn(async job => ({ id: job.key, path: "private/" + job.key, uploaded: false })),
    transfer: vi.fn(async () => completedTransfer()), finalize: vi.fn(async () => {}), remove: vi.fn(async () => {}), saved: vi.fn(async () => {}),
  };
  let snapshot: UploadSnapshot;
  const make = (online = () => true) => new UploadSession(store, operations, value => { snapshot = value; }, online);
  return { store, disk, operations, make, state: () => snapshot };
}
afterEach(() => vi.useRealTimers());

describe("durable bulk upload recovery", () => {
  it("renews an expired allocation after a long manual pause before resuming bytes", async () => {
    vi.useFakeTimers(); const f = fixture(); let failed!: (error: Error) => void;
    f.operations.prepare = vi.fn(async job => ({ id: job.key, path: "private/" + job.key, uploaded: false, expiresAt: new Date(Date.now() + 1000).toISOString() }));
    f.operations.transfer = vi.fn().mockImplementationOnce(async () => ({
      done: new Promise<void>((_, reject) => { failed = reject; }), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), suspend: () => failed(new TransferCancelled()),
    })).mockImplementation(async () => ({ done: Promise.resolve(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), suspend: vi.fn() }));
    const session = f.make(); await session.initialize([photo("a")]); await flush();
    await session.pause(); vi.advanceTimersByTime(1500); await session.resume(); await flush();
    expect(f.operations.prepare).toHaveBeenCalledTimes(2); expect(f.state().completed).toBe(1); await session.dispose();
  });
  it("defers a temporary failure, isolates a permanent rejection, and finishes the rest of 30 files", async () => {
    vi.useFakeTimers();
    const f = fixture(); let fail = true;
    f.operations.prepare = vi.fn(async job => {
      if (job.key === "0" && fail) throw new UploadOperationError("Service busy", true);
      if (job.key === "1") throw new UploadOperationError("Access changed", false);
      return { id: job.key, path: "private/" + job.key, uploaded: false };
    });
    const session = f.make(); await session.initialize(Array.from({ length: 30 }, (_, i) => photo(String(i)))); await flush();
    expect(f.state().completed).toBe(28);
    expect(f.state().items.map(job => job.status)).toEqual(["waiting", "failed"]);
    fail = false; vi.advanceTimersByTime(15000); await session.pump();
    expect(f.state().completed).toBe(29);
    expect(f.state().items[0].key).toBe("1");
    expect(f.operations.finalize).toHaveBeenCalledTimes(29);
    await session.dispose();
  });

  it("restores a completed transfer and retries only processing after a reload", async () => {
    vi.useFakeTimers();
    const f = fixture();
    f.operations.finalize = vi.fn().mockRejectedValueOnce(new UploadOperationError("Still processing", true)).mockResolvedValue(undefined);
    const first = f.make(); await first.initialize([photo("one")]); await flush();
    expect(f.disk.get("one")?.allocation?.uploaded).toBe(true);
    await first.dispose(); vi.advanceTimersByTime(15000);
    const reopened = f.make(); await reopened.initialize([]); await flush();
    expect(f.state().items).toEqual([]); expect(f.state().completed).toBe(1);
    expect(f.operations.prepare).toHaveBeenCalledTimes(1); expect(f.operations.transfer).toHaveBeenCalledTimes(1);
    expect(f.operations.finalize).toHaveBeenCalledTimes(2); expect(f.disk.size).toBe(0);
    await reopened.dispose();
  });

  it("preserves the TUS checkpoint on page closure and passes it to the next transfer", async () => {
    const f = fixture(); let fail!: (error: Error) => void;
    f.operations.transfer = vi.fn(async (_job, _allocation, _progress, checkpoint) => {
      await checkpoint("https://storage.example/storage/v1/upload/resumable/fixture");
      return { done: new Promise<void>((_, reject) => { fail = reject; }), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), suspend: () => fail(new TransferCancelled()) };
    });
    const first = f.make(); await first.initialize([photo("one")]); await flush(); await first.dispose();
    expect(f.disk.get("one")?.allocation?.uploadUrl).toContain("/fixture");
    f.operations.transfer = vi.fn(async (_job, allocation) => {
      expect(allocation.uploadUrl).toContain("/fixture");
      return { done: Promise.resolve(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), suspend: vi.fn() };
    });
    const reopened = f.make(); await reopened.initialize([]); await flush();
    expect(f.operations.finalize).toHaveBeenCalledTimes(1); expect(f.state().completed).toBe(1);
    await reopened.dispose();
  });

  it("keeps a manual pause across reload and online events until Continue", async () => {
    const f = fixture(); const first = f.make(() => false);
    await first.initialize([photo("a"), photo("b")]); await flush(); await first.pause(); await first.dispose();
    const reopened = f.make(); await reopened.initialize([]); reopened.wake(); await flush();
    expect(f.state().paused).toBe(true); expect(f.operations.prepare).not.toHaveBeenCalled();
    await reopened.resume(); await flush(); expect(f.state().completed).toBe(2);
    await reopened.dispose();
  });

  it("retries all remaining files without duplicating a successful file when refresh fails", async () => {
    const f = fixture(); let fail = true;
    f.operations.finalize = vi.fn(async job => { if (job.key === "b" && fail) throw new UploadOperationError("Rejected", false); });
    f.operations.saved = vi.fn().mockRejectedValue(Error("Offline refresh"));
    const session = f.make(); await session.initialize([photo("a"), photo("b")]); await flush();
    expect(f.state().completed).toBe(1); fail = false; await session.retry(); await flush();
    expect(f.state().completed).toBe(2); expect(f.operations.transfer).toHaveBeenCalledTimes(2);
    expect(f.operations.finalize).toHaveBeenCalledTimes(3); await session.dispose();
  });

  it("waits for an in-flight prepare before removing its stable allocation", async () => {
    const f = fixture(); let prepared!: (value: { id: string; path: string; uploaded: boolean }) => void;
    f.operations.prepare = vi.fn(() => new Promise<{ id: string; path: string; uploaded: boolean }>(resolve => { prepared = resolve; }));
    const session = f.make(); await session.initialize([photo("a")]); await flush();
    const removal = session.remove("a"); await flush(); expect(f.operations.remove).not.toHaveBeenCalled();
    prepared({ id: "a", path: "private/a", uploaded: false }); await removal; await flush();
    expect(f.operations.remove).toHaveBeenCalledTimes(1); expect(f.operations.transfer).not.toHaveBeenCalled();
    expect(f.state().items).toEqual([]); expect(f.disk.size).toBe(0); await session.dispose();
  });

  it("does not start network work if storing the selected files fails", async () => {
    const f = fixture(); f.store.add = vi.fn().mockRejectedValue(Error("Storage full"));
    const session = f.make(); await session.initialize([]);
    await expect(session.add([photo("a")])).rejects.toThrow("Storage full");
    expect(f.operations.prepare).not.toHaveBeenCalled(); expect(f.state().items).toEqual([]); await session.dispose();
  });

  it("honors throttling without blocking later files", async () => {
    vi.useFakeTimers(); const f = fixture(); let fail = true;
    f.operations.prepare = vi.fn(async job => {
      if (job.key === "a" && fail) throw new UploadOperationError("Throttled", true, 300000);
      return { id: job.key, path: "private/" + job.key, uploaded: false };
    });
    const session = f.make(); await session.initialize([photo("a"), photo("b")]); await flush();
    expect(f.state().completed).toBe(1); fail = false;
    vi.advanceTimersByTime(15000); session.wake(); await flush(); expect(f.state().completed).toBe(1);
    vi.advanceTimersByTime(285000); await session.pump(); expect(f.state().completed).toBe(2); await session.dispose();
  });
});
