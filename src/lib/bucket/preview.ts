import "server-only";
import { cookies } from "next/headers";
import { deflateSync, inflateSync } from "node:zlib";
import type { BucketItem, BucketList, BucketSubtask } from "./schema";
type Preview = { lists: BucketList[]; items: BucketItem[]; subtasks: BucketSubtask[] };
const cookieName = "us_together_bucket_preview";
function assertPreview() {
  if (process.env.NODE_ENV === "production" || process.env.DEV_LOGIN_ENABLED !== "true") throw new Error("Preview is disabled.");
}
export async function bucketPreview(sessionId: string): Promise<Preview> {
  assertPreview();
  const raw = (await cookies()).get(cookieName)?.value;
  if (raw) try {
    const saved = JSON.parse(inflateSync(Buffer.from(raw, "base64url"), { maxOutputLength: 262144 }).toString("utf8"));
    if (saved.sessionId === sessionId) return saved.data as Preview;
  } catch { /* An expired or malformed preview starts empty; production never uses it. */ }
  return { lists: [], items: [], subtasks: [] };
}
export async function saveBucketPreview(sessionId: string, data: Preview) {
  assertPreview();
  const encoded = deflateSync(Buffer.from(JSON.stringify({ sessionId, data }))).toString("base64url");
  if (encoded.length > 3600) throw new Error("This temporary preview is full. Remove an idea or use your connected account.");
  (await cookies()).set(cookieName, encoded, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 28800 });
}
