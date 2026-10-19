import { describe, expect, it } from "vitest";
import { discard, enqueue, nextQueued, retry, summarize, update, type QueuedPhoto } from "./upload-queue";

const photo = (key: string, mime = "image/jpeg"): QueuedPhoto => ({ key, mime, caption: "", file: new File(["x"], key + (mime.startsWith("image/") ? ".jpg" : ".mp4"), { type: mime }) });

describe("upload queue", () => {
  it("adds files in the order chosen and ignores a file already queued", () => {
    const first = enqueue([], [photo("a"), photo("b")]);
    const again = enqueue(first, [photo("b"), photo("c")]);
    expect(again.map(item => item.key)).toEqual(["a", "b", "c"]);
    expect(again.every(item => item.status === "queued" && item.progress === 0)).toBe(true);
  });

  it("sends the first waiting file and skips ones already moving or stopped", () => {
    let items = enqueue([], [photo("a"), photo("b"), photo("c")]);
    items = update(items, "a", { status: "sending", progress: 40 });
    items = update(items, "b", { status: "failed", error: "Too large" });
    expect(nextQueued(items)?.key).toBe("c");
  });

  it("puts a retried file at the back of the line and clears its reason", () => {
    let items = enqueue([], [photo("a"), photo("b")]);
    items = update(items, "a", { status: "failed", error: "Couldn't add", progress: 70 });
    items = retry(items, "a");
    expect(items.map(item => item.key)).toEqual(["b", "a"]);
    expect(items[1]).toMatchObject({ status: "queued", progress: 0, error: "" });
  });

  it("only retries a stopped file", () => {
    const items = update(enqueue([], [photo("a")]), "a", { status: "sending" });
    expect(retry(items, "a")[0].status).toBe("sending");
  });

  it("removes a file without disturbing the rest", () => {
    const items = discard(enqueue([], [photo("a"), photo("b")]), "a");
    expect(items.map(item => item.key)).toEqual(["b"]);
  });
});

describe("batch summary", () => {
  it("speaks in photos, videos or files and averages progress", () => {
    let items = enqueue([], [photo("a"), photo("b")]);
    items = update(items, "a", { status: "processing" });
    expect(summarize(items, { paused: false, waiting: false })).toMatchObject({ title: "Adding 2 photos", progress: 50, failed: 0 });
    expect(summarize(enqueue([], [photo("v", "video/mp4")]), { paused: false, waiting: false }).title).toBe("Adding 1 video");
    expect(summarize(enqueue([], [photo("a"), photo("v", "video/mp4")]), { paused: false, waiting: false }).title).toBe("Adding 2 files");
  });

  it("says when it is paused or waiting for a connection", () => {
    const items = enqueue([], [photo("a")]);
    expect(summarize(items, { paused: true, waiting: true }).title).toBe("Paused · 1 photo still to add");
    expect(summarize(items, { paused: false, waiting: true })).toMatchObject({ title: "Waiting for a connection", detail: "They'll carry on by themselves when you're back online." });
  });

  it("reports failures without counting them as work left", () => {
    let items = enqueue([], [photo("a"), photo("b")]);
    items = update(items, "b", { status: "failed", error: "x" });
    const summary = summarize(items, { paused: false, waiting: false });
    expect(summary).toMatchObject({ active: 1, failed: 1, title: "Adding 1 photo" });
    expect(summary.detail).toContain("couldn't be added");
    expect(summarize(update(items, "a", { status: "failed" }), { paused: false, waiting: false }).title).toBe("");
  });
});
