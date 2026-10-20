import { requireSupabaseConfig } from "@/lib/supabase/config";
import { resumableAuthOptions, uploadFailure } from "./resumable-upload";
import { UploadOperationError } from "./upload-errors";

type Auth = Parameters<typeof resumableAuthOptions>[0];
export class TransferCancelled extends Error {}
export type Transfer = {
  done: Promise<void>;
  pause: () => Promise<void>;
  resume: () => void;
  cancel: () => Promise<void>;
  /** Leave server bytes and the checkpoint intact when this page goes away. */
  suspend: () => void;
};

export function safeUploadUrl(value: string | undefined, origin: string): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.origin === origin && !url.username && !url.password && !url.search && !url.hash && url.pathname.startsWith("/storage/v1/upload/resumable/")) return url.href;
  } catch { /* A corrupt local checkpoint starts a fresh authenticated transport. */ }
}

/** Bounded transport attempts yield to the queue; a silent request cannot hold a batch forever. */
export async function startTransfer({ file, mime, bucket, objectName, auth, onProgress, uploadUrl, onUploadUrl }: {
  file: File; mime: string; bucket: "memory-media" | "moment-media"; objectName: string; auth: Auth;
  onProgress: (percent: number) => void; uploadUrl?: string; onUploadUrl: (url: string) => Promise<void>;
}): Promise<Transfer> {
  const { Upload } = await import("tus-js-client");
  const config = requireSupabaseConfig();
  const host = new URL(config.url);
  host.hostname = host.hostname.replace(".supabase.co", ".storage.supabase.co");
  let held = false, settled = false, lastActivity = Date.now();
  let checkpoint = Promise.resolve();
  let resolve!: () => void, reject!: (error: Error) => void;
  const done = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const options = resumableAuthOptions(auth);
  function finish(error?: Error) {
    if (settled) return;
    settled = true; clearInterval(watchdog);
    if (error) reject(error); else resolve();
  }
  const upload = new Upload(file, {
    ...options,
    endpoint: host.origin + "/storage/v1/upload/resumable",
    uploadUrl: safeUploadUrl(uploadUrl, host.origin),
    headers: { apikey: config.publishableKey },
    chunkSize: 6 * 1024 * 1024, uploadDataDuringCreation: true,
    storeFingerprintForResuming: false, removeFingerprintOnSuccess: true,
    metadata: { bucketName: bucket, objectName, contentType: mime, cacheControl: "60" },
    onBeforeRequest: async request => { await checkpoint; await options.onBeforeRequest!(request); },
    onAfterResponse: () => { lastActivity = Date.now(); },
    onUploadUrlAvailable: () => {
      if (!upload.url) return;
      checkpoint = onUploadUrl(upload.url);
      void checkpoint.catch(() => { void upload.abort(); finish(Error("Could not save upload progress. Free device storage and try again.")); });
    },
    onProgress: (sent, total) => { lastActivity = Date.now(); onProgress(total ? Math.round(sent / total * 100) : 0); },
    onSuccess: () => { void checkpoint.then(() => finish(), () => finish(Error("Could not save upload progress. Try again."))); },
    onError: error => {
      const failure = uploadFailure(error), expired = failure.status === 404 || failure.status === 410;
      finish(new UploadOperationError(expired ? "The partial transfer expired. This file will retry automatically." : failure.message, failure.recoverable || expired, failure.status === 429 ? 300000 : 0, expired));
    },
  });
  // XHR has no timeout in this tus version. Watch actual activity rather than
  // imposing a whole-file deadline on a healthy but slow connection.
  const watchdog = setInterval(() => {
    if (!held && !settled && Date.now() - lastActivity >= 90000) {
      void upload.abort();
      finish(new UploadOperationError("The connection stopped responding. This file will retry automatically.", true));
    }
  }, 5000);
  upload.start();
  return {
    done,
    pause: async () => { held = true; if (!settled) await upload.abort(); },
    resume: () => { held = false; lastActivity = Date.now(); if (!settled) upload.start(); },
    cancel: async () => { held = true; try { await upload.abort(true); } catch { /* Abandoned TUS resources expire server-side. */ } finish(new TransferCancelled("Removed.")); },
    suspend: () => { held = true; void upload.abort().catch(() => {}); finish(new TransferCancelled("Page closed.")); },
  };
}
