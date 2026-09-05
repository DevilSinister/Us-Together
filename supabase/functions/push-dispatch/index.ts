import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

/**
 * Signs and sends the Web Push envelopes the database dispatcher claimed, then
 * reports each outcome back so the worker can retry, give up, or retire a dead
 * endpoint.
 *
 * The function is called by pg_net, not by a browser, so it authenticates with a
 * shared secret rather than a user JWT (verify_jwt is off for this function in
 * config.toml). It never queries content: everything it sends arrives in the
 * request body, and that body already carries only the generic notification title.
 */

type Delivery = {
  deliveryId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  category: string;
  targetType: string | null;
  targetId: string | null;
};

const paths: Record<string, string> = { plan: "/plans", memory: "/memories", milestone: "/milestones", note: "/notes" };

/** Mirrors the inbox's own link rule so a tapped push lands where the row points. */
function targetPath(delivery: Delivery) {
  if (!delivery.targetType || !delivery.targetId) return "/notifications";
  const base = paths[delivery.targetType];
  return base ? `${base}/${delivery.targetId}` : "/notifications";
}

const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const expected = Deno.env.get("PUSH_DISPATCH_SECRET");
  const presented = request.headers.get("x-dispatch-secret");
  if (!expected || !presented || presented !== expected) return response({ error: "Not found." }, 404);

  const subject = Deno.env.get("VAPID_SUBJECT");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!subject || !publicKey || !privateKey) return response({ error: "Push is not configured." }, 503);
  webpush.setVapidDetails(subject, publicKey, privateKey);

  let deliveries: Delivery[];
  try {
    const body = await request.json();
    deliveries = Array.isArray(body?.deliveries) ? body.deliveries.slice(0, 200) : [];
  } catch {
    return response({ error: "Malformed dispatch." }, 400);
  }
  if (!deliveries.length) return response({ settled: 0 });

  const results = await Promise.all(deliveries.map(async (delivery) => {
    const payload = JSON.stringify({
      title: delivery.title,
      body: "",
      url: targetPath(delivery),
      // One tag per notification row, so a retry replaces the alert instead of stacking a second one.
      tag: `us-${delivery.deliveryId}`,
    });
    try {
      await webpush.sendNotification(
        { endpoint: delivery.endpoint, keys: { p256dh: delivery.p256dh, auth: delivery.auth } },
        payload,
        { TTL: 3600, urgency: "normal" },
      );
      return { deliveryId: delivery.deliveryId, outcome: "delivered" };
    } catch (error) {
      // 404 and 410 mean the endpoint is permanently gone; everything else may recover.
      const status = (error as { statusCode?: number }).statusCode;
      return { deliveryId: delivery.deliveryId, outcome: status === 404 || status === 410 ? "gone" : "failed" };
    }
  }));

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await admin.rpc("settle_push_deliveries", { input: { results } });
  // An unsettled batch is retried by the worker's own backoff, so this is not fatal.
  if (error) return response({ settled: 0, retry: true }, 503);
  return response({ settled: results.length });
});
