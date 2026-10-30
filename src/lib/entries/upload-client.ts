import { UploadOperationError, mediaOperationResult } from "./upload-errors";
import type { UploadAllocation } from "./upload-batch";
import { z } from "zod";

type MediaResult = Partial<UploadAllocation> & { error?: string; status?: number; retryable?: boolean; ok?: boolean };
const resultSchema = z.object({ id: z.uuid().optional(), path: z.string().max(1024).optional(), uploaded: z.boolean().optional(), expiresAt: z.iso.datetime().optional(), error: z.string().max(1000).optional(), status: z.number().int().min(100).max(599).optional(), retryable: z.boolean().optional(), ok: z.boolean().optional() });

/** A separate abortable request avoids the serial Server Action dispatcher. */
export async function uploadRequest(input: Record<string, unknown>, expectedUserId: string): Promise<MediaResult> {
  let response: Response;
  try {
    response = await fetch("/api/entry-uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, expectedUserId }), signal: AbortSignal.timeout(60000) });
  } catch { throw new UploadOperationError("Could not reach the upload service. This file will retry automatically.", true); }
  let result: MediaResult;
  try { result = resultSchema.parse(await response.json()); } catch { throw new UploadOperationError("The upload service did not respond. This file will retry automatically.", true); }
  if (!response.ok && !result.error) throw new UploadOperationError("The upload service is unavailable. Try again.", response.status >= 500 || response.status === 429);
  return mediaOperationResult(result);
}
