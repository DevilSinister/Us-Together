import { requireSupabaseConfig } from "@/lib/supabase/config";
import { resumableAuthOptions, uploadFailure } from "./resumable-upload";

type Auth = Parameters<typeof resumableAuthOptions>[0];

/** Raised when the person removes a file that was still sending. */
export class TransferCancelled extends Error {}

export type Transfer = {
  /** Settles when the original is fully stored, or with the reason it never will be. */
  done: Promise<void>;
  /** Hold the transfer where it is. It does not resume on its own until `resume`. */
  pause: () => Promise<void>;
  resume: () => void;
  /** Stop and discard the partial transfer. */
  cancel: () => Promise<void>;
};

/**
 * One file's resumable transfer into private Storage.
 *
 * The engine underneath is tus, and none of it reaches the person. A dropped
 * connection is not an error: the transfer reports that it is waiting and
 * carries on from the stored offset when the device is online and in front of
 * them again. Only a rejection that retrying cannot fix settles `done` with a
 * reason, already worded for the couple, never with a URL or response body.
 */
export async function startTransfer({ file, mime, bucket, objectName, auth, onProgress, onWaiting }: {
  file: File;
  mime: string;
  bucket: "memory-media" | "moment-media";
  objectName: string;
  auth: Auth;
  onProgress: (percent: number) => void;
  onWaiting: (waiting: boolean) => void;
}): Promise<Transfer> {
  const { Upload } = await import("tus-js-client");
  const config = requireSupabaseConfig();
  const host = new URL(config.url);
  host.hostname = host.hostname.replace(".supabase.co", ".storage.supabase.co");

  let held = false, waiting = false, settled = false;
  let resolve!: () => void, reject!: (error: Error) => void;
  const done = new Promise<void>((yes, no) => { resolve = yes; reject = no; });

  const wake = () => {
    if (waiting && !held && !settled && navigator.onLine && document.visibilityState === "visible") {
      waiting = false;
      onWaiting(false);
      upload.start();
    }
  };
  function finish(error?: Error) {
    if (settled) return;
    settled = true;
    window.removeEventListener("online", wake);
    document.removeEventListener("visibilitychange", wake);
    if (waiting) onWaiting(false);
    if (error) reject(error);
    else resolve();
  }

  const upload = new Upload(file, {
    ...resumableAuthOptions(auth),
    endpoint: host.origin + "/storage/v1/upload/resumable",
    headers: { apikey: config.publishableKey },
    chunkSize: 6 * 1024 * 1024,
    uploadDataDuringCreation: true,
    storeFingerprintForResuming: false,
    removeFingerprintOnSuccess: true,
    metadata: { bucketName: bucket, objectName, contentType: mime, cacheControl: "60" },
    onProgress: (sent, total) => onProgress(total ? Math.round(sent / total * 100) : 0),
    onSuccess: () => finish(),
    onError: error => {
      const failure = uploadFailure(error);
      if (!failure.recoverable) { finish(Error(failure.message)); return; }
      waiting = true;
      onWaiting(true);
    },
  });

  window.addEventListener("online", wake);
  document.addEventListener("visibilitychange", wake);
  upload.start();

  return {
    done,
    pause: async () => { held = true; if (!settled) await upload.abort(); },
    resume: () => {
      held = false;
      if (settled) return;
      if (waiting) { waiting = false; onWaiting(false); }
      upload.start();
    },
    cancel: async () => {
      held = true;
      try { await upload.abort(true); } catch { /* The server expires an abandoned transfer itself. */ }
      finish(new TransferCancelled("Removed."));
    },
  };
}
