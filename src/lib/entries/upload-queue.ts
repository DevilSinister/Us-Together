/**
 * The model behind photos being added to a memory or moment.
 *
 * Files start sending the moment they are chosen, one at a time, in the order
 * chosen. Each file carries its own state so the grid can show it where it
 * will live: waiting, sending with its progress, finishing on the server, or
 * stopped with a reason. A finished file leaves the queue; the saved tile
 * replaces it. Nothing here touches the network.
 */

export type QueuedPhoto = { key: string; file: File; caption: string; mime: string };

export type UploadStatus = "queued" | "sending" | "processing" | "failed";

/** `stored` is the server row reserved for this file, once there is one. */
export type UploadItem = QueuedPhoto & { status: UploadStatus; progress: number; error: string; stored?: string };

export function enqueue(items: readonly UploadItem[], photos: readonly QueuedPhoto[]): UploadItem[] {
  const known = new Set(items.map(item => item.key));
  return [...items, ...photos.filter(photo => !known.has(photo.key)).map(photo => ({ ...photo, status: "queued" as const, progress: 0, error: "" }))];
}

export function update(items: readonly UploadItem[], key: string, changes: Partial<Pick<UploadItem, "status" | "progress" | "error" | "stored">>): UploadItem[] {
  return items.map(item => item.key === key ? { ...item, ...changes } : item);
}

export function discard(items: readonly UploadItem[], key: string): UploadItem[] {
  return items.filter(item => item.key !== key);
}

export function nextQueued(items: readonly UploadItem[]): UploadItem | undefined {
  return items.find(item => item.status === "queued");
}

/** A failed file goes back to the end of the line, keeping any transfer it already made. */
export function retry(items: readonly UploadItem[], key: string): UploadItem[] {
  const item = items.find(entry => entry.key === key);
  if (!item || item.status !== "failed") return [...items];
  return [...discard(items, key), { ...item, status: "queued", progress: 0, error: "" }];
}

function noun(count: number, photos: number) {
  if (photos === count) return count === 1 ? "photo" : "photos";
  if (photos === 0) return count === 1 ? "video" : "videos";
  return "files";
}

/**
 * One sentence for the whole batch, in the couple's words, and how far along
 * the active files are. Failed files are reported but do not count as
 * progress still to come.
 */
export function summarize(items: readonly UploadItem[], { paused, waiting }: { paused: boolean; waiting: boolean }) {
  const active = items.filter(item => item.status !== "failed");
  const failed = items.length - active.length;
  const photos = active.filter(item => item.mime.startsWith("image/")).length;
  const what = noun(active.length, photos);
  const progress = active.length ? Math.round(active.reduce((sum, item) => sum + (item.status === "processing" ? 100 : item.progress), 0) / active.length) : 0;
  let title = "";
  if (active.length) {
    if (paused) title = `Paused · ${active.length} ${what} still to add`;
    else if (waiting) title = "Waiting for a connection";
    else title = `Adding ${active.length} ${what}`;
  }
  const detail = waiting && !paused
    ? "They'll carry on by themselves when you're back online."
    : failed
      ? `${failed} ${failed === 1 ? "file" : "files"} couldn't be added. Tap ${failed === 1 ? "it" : "one"} to try again.`
      : "";
  return { title, detail, progress, active: active.length, failed };
}
