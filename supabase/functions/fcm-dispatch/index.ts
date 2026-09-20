import { createClient } from "npm:@supabase/supabase-js@2.112.4";

/**
 * Sends the Android (FCM) envelopes that private.dispatch_due_fcm claimed, then reports
 * each outcome back so the worker can retry, give up, or retire a dead device token.
 *
 * Called by pg_net, never by a phone, so it authenticates with a shared secret
 * (verify_jwt is off for this function in config.toml). It never queries content: the
 * body already carries only the generic notification title and a target pointer, and
 * that is all that reaches Google. Data-only messages are used so the app decides how
 * to present them; a `drawing` envelope is high priority so Doze wakes the widget.
 */

type Delivery = {
  deliveryId: string;
  token: string;
  notificationId: string;
  title: string;
  category: string;
  targetType: string | null;
  targetId: string | null;
};

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

const paths: Record<string, string> = { plan: "/plans", memory: "/memories", milestone: "/milestones", note: "/notes", bucket: "/bucket", bucket_list: "/bucket/lists", wishlist: "/wishlist", drawing: "/drawings" };

/** Mirrors the inbox's own link rule so a tapped alert lands where the row points. */
function targetPath(delivery: Delivery) {
  if (!delivery.targetType || !delivery.targetId) return "/notifications";
  const base = paths[delivery.targetType];
  return base ? `${base}/${delivery.targetId}` : "/notifications";
}

const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const base64url = (bytes: Uint8Array | string) => {
  const raw = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let binary = "";
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

function pemToDer(pem: string) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Google OAuth access token for the FCM scope, minted from the service account with WebCrypto. */
async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(header + "." + claim)));
  const assertion = header + "." + claim + "." + base64url(signature);
  const reply = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(8000),
  });
  if (!reply.ok) throw new Error("token " + reply.status);
  const json = await reply.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("token missing");
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return json.access_token;
}

/** FCM v1 says a token is dead with 404, or 400/403 carrying UNREGISTERED / INVALID_ARGUMENT. */
async function isGone(reply: Response) {
  if (reply.status === 404) return true;
  if (reply.status !== 400 && reply.status !== 403) return false;
  try {
    const body = await reply.json() as { error?: { details?: { errorCode?: string }[]; status?: string } };
    const codes = (body.error?.details ?? []).map((detail) => detail.errorCode);
    return codes.includes("UNREGISTERED") || codes.includes("INVALID_ARGUMENT") || body.error?.status === "NOT_FOUND";
  } catch {
    return false;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const expected = Deno.env.get("PUSH_DISPATCH_SECRET");
  const presented = request.headers.get("x-dispatch-secret");
  if (!expected || !presented || presented !== expected) return response({ error: "Not found." }, 404);

  let account: ServiceAccount;
  try {
    const parsed = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "") as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key?.includes("BEGIN PRIVATE KEY") || !parsed.project_id) throw new Error("incomplete");
    account = parsed as ServiceAccount;
  } catch {
    return response({ error: "Android push is not configured." }, 503);
  }

  let deliveries: Delivery[];
  try {
    const body = await request.json();
    deliveries = Array.isArray(body?.deliveries) ? body.deliveries.slice(0, 200) : [];
  } catch {
    return response({ error: "Malformed dispatch." }, 400);
  }
  if (!deliveries.length) return response({ settled: 0 });

  let bearer: string;
  try { bearer = await accessToken(account); }
  catch { return response({ settled: 0, retry: true }, 503); }

  const endpoint = "https://fcm.googleapis.com/v1/projects/" + encodeURIComponent(account.project_id) + "/messages:send";
  const results = await Promise.all(deliveries.map(async (delivery) => {
    const message = {
      token: delivery.token,
      data: {
        type: delivery.category,
        category: delivery.category,
        title: delivery.title,
        targetType: delivery.targetType ?? "",
        targetId: delivery.targetId ?? "",
        targetPath: targetPath(delivery),
        notificationId: delivery.notificationId,
        deliveryId: delivery.deliveryId,
        // One tag per notification row, so a retry replaces the alert instead of stacking a second one.
        tag: `us-${delivery.notificationId}`,
      },
      android: { priority: delivery.category === "drawing" ? "HIGH" : "NORMAL", ttl: "3600s" },
    };
    try {
      const reply = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: "Bearer " + bearer, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(8000),
      });
      if (reply.ok) return { deliveryId: delivery.deliveryId, outcome: "delivered" };
      return { deliveryId: delivery.deliveryId, outcome: (await isGone(reply)) ? "gone" : "failed" };
    } catch {
      return { deliveryId: delivery.deliveryId, outcome: "failed" };
    }
  }));

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await admin.rpc("settle_fcm_deliveries", { input: { results } });
  // An unsettled batch is retried by the worker's own backoff, so this is not fatal.
  if (error) return response({ settled: 0, retry: true }, 503);
  return response({ settled: results.length });
});
