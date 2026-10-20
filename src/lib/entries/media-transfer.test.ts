import { afterEach, describe, expect, it, vi } from "vitest";
import type { Upload } from "tus-js-client";
import { startTransfer, safeUploadUrl } from "./media-transfer";

type Options = ConstructorParameters<typeof Upload>[1];
const fake = vi.hoisted(() => ({ options: {} as Options, start: vi.fn(), abort: vi.fn(async () => {}) }));
vi.mock("tus-js-client", () => ({ Upload: class {
  url = "https://fixture.storage.supabase.co/storage/v1/upload/resumable/fictional";
  constructor(_file: File, options: Options) { fake.options = options; }
  start = fake.start; abort = fake.abort;
} }));
vi.mock("@/lib/supabase/config", () => ({ requireSupabaseConfig: () => ({ url: "https://fixture.supabase.co", publishableKey: "fictional-public-key" }) }));
const transfer = () => startTransfer({ file: new File(["fixture"], "fixture.png"), mime: "image/png", bucket: "memory-media", objectName: "private/original",
  auth: { getSession: async () => ({ data: { session: { access_token: "fictional" } }, error: null }), refreshSession: vi.fn() }, onProgress: vi.fn(), onUploadUrl: vi.fn(async () => {}) });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("bounded transfer attempts", () => {
  it("settles after exhausted connection retries without waiting for an online event", async () => {
    const control = await transfer();
    const result = expect(control.done).rejects.toMatchObject({ recoverable: true });
    fake.options.onError!(Object.assign(Error("private response"), { originalResponse: { getStatus: () => 503 } }));
    await result;
  });
  it("times out a silent request, but preserves a manual pause and healthy slow progress", async () => {
    vi.useFakeTimers(); const control = await transfer();
    const result = expect(control.done).rejects.toMatchObject({ recoverable: true });
    await vi.advanceTimersByTimeAsync(85000); fake.options.onProgress!(1, 10);
    await vi.advanceTimersByTimeAsync(85000); expect(fake.abort).not.toHaveBeenCalled();
    await control.pause(); await vi.advanceTimersByTimeAsync(180000); expect(fake.abort).toHaveBeenCalledTimes(1);
    control.resume(); await vi.advanceTimersByTimeAsync(90000); await result;
    expect(fake.abort).toHaveBeenCalledTimes(2);
  });
  it("suspends without terminating the remote partial upload", async () => {
    const control = await transfer(); const result = expect(control.done).rejects.toThrow("Page closed");
    control.suspend(); await result; expect(fake.abort).toHaveBeenCalledWith();
  });
  it("never sends fresh credentials to an untrusted restored upload URL", () => {
    const origin = "https://fixture.storage.supabase.co";
    expect(safeUploadUrl(origin + "/storage/v1/upload/resumable/fictional", origin)).toContain("fictional");
    for (const value of ["https://foreign.example/storage/v1/upload/resumable/id", origin + "/anything", origin + "/storage/v1/upload/resumable/id?token=private", "not a URL"]) expect(safeUploadUrl(value, origin)).toBeUndefined();
  });
});
