import "server-only";
import { createSign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const serviceAccountSchema = z.object({
  client_email: z.email(),
  private_key: z.string().includes("BEGIN PRIVATE KEY"),
  project_id: z.string().min(1),
});
type Account = z.infer<typeof serviceAccountSchema>;
const base64url = (value: string) => Buffer.from(value).toString("base64url");

async function accessToken(account: Account) {
  const now = Math.floor(Date.now() / 1000);
  const claim = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    base64url(JSON.stringify({
      iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    }));
  const signature = createSign("RSA-SHA256").update(claim).sign(account.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: claim + "." + signature }),
    cache: "no-store", signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return null;
  const parsed = z.object({ access_token: z.string().min(1) }).safeParse(await response.json());
  return parsed.success ? parsed.data.access_token : null;
}

/** Best-effort content-free wakeup. A failed FCM call never rolls back a sent note. */
export async function notifyDrawingRecipient(recipientId: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!secret || !serviceJson) return;
  try {
    const account = serviceAccountSchema.parse(JSON.parse(serviceJson));
    const config = requireSupabaseConfig();
    const admin = createClient<Database>(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.from("drawing_devices").select("token").eq("user_id", recipientId).limit(20);
    if (error || !data?.length) return;
    const bearer = await accessToken(account);
    if (!bearer) return;
    await Promise.all(data.map(async ({ token }) => {
      const response = await fetch("https://fcm.googleapis.com/v1/projects/" + encodeURIComponent(account.project_id) + "/messages:send", {
        method: "POST", headers: { Authorization: "Bearer " + bearer, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token, data: { type: "drawing" }, android: { priority: "NORMAL" } } }),
        cache: "no-store", signal: AbortSignal.timeout(4000),
      });
      if (response.status === 404 || response.status === 410) {
        await admin.from("drawing_devices").delete().eq("token", token).eq("user_id", recipientId);
      }
    }));
  } catch {
    // Content and credentials are never logged. The companion refreshes on open.
  }
}
