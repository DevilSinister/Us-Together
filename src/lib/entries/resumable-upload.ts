import type { Upload } from "tus-js-client";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

type UploadOptions = ConstructorParameters<typeof Upload>[1];
type Session = { access_token: string; expires_at?: number };
type Auth = {
  getSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
  refreshSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
};

class UploadSessionError extends Error {}

/** Keep credentials fresh across chunks, retries and a long manual pause. */
export function resumableAuthOptions(auth: Auth): UploadOptions {
  let refresh = false;
  let rejectedToken = "";
  let sentToken = "";
  return {
    retryDelays: [0, 3000, 5000, 10000, 20000],
    onBeforeRequest: async request => {
      let result = await auth.getSession();
      const session = result.data.session;
      if (refresh || (session?.expires_at !== undefined && session.expires_at * 1000 <= Date.now() + 60000)) {
        result = await auth.refreshSession();
      }
      // A disconnected token refresh is a connection pause, not a sign-out.
      if (isAuthRetryableFetchError(result.error)) throw result.error;
      if (result.error || !result.data.session) throw new UploadSessionError("Your session expired. Sign in again before retrying the remaining files.");
      refresh = false;
      sentToken = result.data.session.access_token;
      request.setHeader("authorization", "Bearer " + sentToken);
    },
    onShouldRetry: error => {
      const failure = uploadFailure(error);
      const status = failure.status;
      // Refresh once per rejected credential; a revoked session must not loop.
      if (status === 401 && rejectedToken !== sentToken) {
        rejectedToken = sentToken;
        refresh = true;
        return true;
      }
      return failure.recoverable;
    },
  };
}

/** Never expose TUS messages: they contain private upload URLs and responses. */
export function uploadFailure(error: Error): { status: number; recoverable: boolean; message: string } {
  const detail = error as Error & { originalResponse?: { getStatus: () => number }; causingError?: Error };
  const status = detail.originalResponse?.getStatus() ?? 0;
  if (error instanceof UploadSessionError || detail.causingError instanceof UploadSessionError) {
    return { status, recoverable: false, message: "You were signed out. Sign in again, then tap to try again." };
  }
  if (status === 401) return { status, recoverable: false, message: "You were signed out. Sign in again, then tap to try again." };
  // Storage refuses a file whose upload window closed. That is not a sign-out.
  if (status === 403) return { status, recoverable: false, message: "Storage wouldn't take this file. Tap to try again." };
  if (status === 413) return { status, recoverable: false, message: "This file is too large to add." };
  const recoverable = status === 0 || status === 408 || status === 409 || status === 423 || status === 429 || status >= 500;
  // Only a request that never got an answer is about the connection. A busy or
  // failing storage service says so, and is never blamed on the person's network.
  return { status, recoverable, message: !recoverable
    ? "This one couldn't be added. Tap to try again, or remove it and choose it again."
    : status === 0 ? "The connection dropped while sending. This file will try again by itself."
    : status === 429 ? "Storage is busy. This file will try again by itself in a few minutes."
    : "Storage couldn't take this file just now. It will try again by itself." };
}
