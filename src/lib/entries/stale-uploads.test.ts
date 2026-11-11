import { describe, expect, it, vi } from "vitest";
import { settleStaleUploads, staleUploads, type StaleOutcome } from "./stale-uploads";
import type { EntryMedia } from "./types";

const now = Date.parse("2026-11-10T12:00:00Z");
const hours = (count: number) => new Date(now + count * 3600000).toISOString();
const row = (id: string, changes: Partial<EntryMedia> = {}): EntryMedia => ({ id, caption: "", media_type: "image", mime_type: "image/jpeg", state: "pending", size_bytes: 10, duration_seconds: null, mine: true, upload_expires_at: hours(-5), ...changes });

describe("abandoned reservations", () => {
  it("selects only this person's unfinished rows whose upload window closed over an hour ago", () => {
    const media = [
      row("old-pending"), row("old-failed", { state: "failed" }),
      row("ready", { state: "ready" }), row("deleting", { state: "deleting" }), row("processing", { state: "processing" }),
      row("partner", { mine: false }), row("sending-here"),
      row("window-open", { upload_expires_at: hours(0.5) }), row("just-closed", { upload_expires_at: hours(-0.5) }),
      row("unknown-window", { upload_expires_at: undefined }),
    ];
    expect(staleUploads(media, new Set(["sending-here"]), now).map(file => file.id)).toEqual(["old-pending", "old-failed"]);
  });

  it("publishes a row whose file arrived and releases one whose file never did", async () => {
    const run = vi.fn(async (operation: "finalize" | "remove", id: string): Promise<StaleOutcome> =>
      operation === "finalize" && id === "empty" ? { error: "Upload has not finished. Resume it or try again." } : {});
    expect(await settleStaleUploads([row("arrived"), row("empty")], run)).toEqual({ published: 1, released: 1 });
    expect(run.mock.calls).toEqual([["finalize", "arrived"], ["finalize", "empty"], ["remove", "empty"]]);
  });

  it("releases an empty row even when the service marks that answer as retryable", async () => {
    const run = vi.fn(async (operation: "finalize" | "remove"): Promise<StaleOutcome> =>
      operation === "finalize" ? { error: "Upload has not finished. Resume it or try again.", retryable: true } : {});
    expect(await settleStaleUploads([row("empty")], run)).toEqual({ published: 0, released: 1 });
  });

  it("never removes a row over any other refusal", async () => {
    const run = vi.fn(async (operation: "finalize" | "remove", id: string): Promise<StaleOutcome> => ({ error: "Could not process this file. Retry or remove it and choose another. " + operation + id }));
    expect(await settleStaleUploads([row("a"), row("b")], run)).toEqual({ published: 0, released: 0 });
    expect(run.mock.calls).toEqual([["finalize", "a"], ["finalize", "b"]]);
  });

  it("stops at a temporary refusal instead of spending a request on every remaining row", async () => {
    const run = vi.fn(async (): Promise<StaleOutcome> => ({ error: "You've added a lot in a short time.", retryable: true }));
    expect(await settleStaleUploads([row("a"), row("b"), row("c")], run)).toEqual({ published: 0, released: 0 });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
