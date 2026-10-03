
/**
 * Sends the Android (FCM) envelopes that private.dispatch_due_fcm claimed, then reports
 * each outcome back so the worker can retry, give up, or retire a dead device token.
 *
 * Called by pg_net, never by a phone, so it authenticates with a shared secret
 * (verify_jwt is off for this function in config.toml). It never queries content: the
 * body already carries only the generic notification title and a target pointer, and
 * that is all that reaches Google. Data-only messages are used so the app decides how
 * to present them; user-visible envelopes use high priority so Doze can deliver the alert promptly.
 */

type Delivery = {deliveryId:string;token:string;notificationId:string;title:string;category:string;targetType:string|null;targetId:string|null};
type Dispatch = {mode:"deliver"|"validate";deliveries:Delivery[]};

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



/** Google OAuth access token for the FCM scope, minted from the service account with WebCrypto. */
async function accessToken(account: ServiceAccount, fetch: typeof globalThis.fetch) {
  const now = Math.floor(Date.now() / 1000);

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

  return json.access_token;
}

/** Retire only an explicit FCM token error; route/IAM failures keep devices intact. */
export async function isGone(reply: Response) {
  try {
    const body = await reply.json() as { error?: { details?: { "@type"?: string; errorCode?: string }[] } };
    return (body.error?.details ?? []).some(detail =>
      detail["@type"] === "type.googleapis.com/google.firebase.fcm.v1.FcmError" && detail.errorCode === "UNREGISTERED");
  } catch { return false; }
}

type Outcome = { deliveryId: string; outcome: "delivered" | "gone" | "failed" };
type Dependencies = {
  parse: (body: unknown) => Dispatch;
  env: (name: string) => string | undefined;
  authorize: (secret: string) => Promise<boolean>;
  settle: (results: Outcome[]) => Promise<void>;
  fetch: typeof globalThis.fetch;
};

export function createHandler({parse, env, authorize, settle, fetch}: Dependencies) {
 let cachedToken: {value:string;expiresAt:number} | null = null;
 return async (request: Request) => {

  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const presented = request.headers.get("x-dispatch-secret");
  if (!presented || presented.length < 20 || presented.length > 4096) return response({ error: "Not found." }, 404);
  try {
    if (!await authorize(presented)) return response({ error: "Not found." }, 404);
  } catch { return response({ error: "Dispatch authorization unavailable." }, 503); }

  let account: ServiceAccount;
  try {
    const parsed = JSON.parse(env("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "") as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key?.includes("BEGIN PRIVATE KEY") || !parsed.project_id) throw new Error("incomplete");
    account = parsed as ServiceAccount;
  } catch {
    return response({ error: "Android push is not configured." }, 503);
  }

  let dispatch: Dispatch;
  try {
    dispatch = parse(await request.json());
  } catch {
    return response({ error: "Malformed dispatch." }, 400);
  }
  const {deliveries, mode} = dispatch;
  if (!deliveries.length && mode === "deliver") return response({ settled: 0 });

  let bearer: string;
  try {
    const now = Math.floor(Date.now()/1000);
    if (cachedToken && cachedToken.expiresAt > now+60) bearer=cachedToken.value;
    else {bearer=await accessToken(account, fetch);cachedToken={value:bearer,expiresAt:now+3000};}
  }
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
      android: { priority: "HIGH", ttl: "3600s" },
    };
    try {
      const reply = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: "Bearer " + bearer, "Content-Type": "application/json" },
        body: JSON.stringify({ message, ...(mode === "validate" ? {validate_only: true} : {}) }),
        signal: AbortSignal.timeout(8000),
      });
      if (reply.ok) return { deliveryId: delivery.deliveryId, outcome: "delivered" };
      return { deliveryId: delivery.deliveryId, outcome: (await isGone(reply)) ? "gone" : "failed" };
    } catch {
      return { deliveryId: delivery.deliveryId, outcome: "failed" };
    }
  }));

  if (mode === "validate") return response({validated: results.filter(result=>result.outcome === "delivered").length, unregistered: results.filter(result=>result.outcome === "gone").length, failed: results.filter(result=>result.outcome === "failed").length});
  try { await settle(results as Outcome[]); }
  catch { return response({ settled: 0, retry: true }, 503); }
  return response({ settled: results.length });
 };
}
