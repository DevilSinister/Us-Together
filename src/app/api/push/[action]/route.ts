import { getCurrentIdentity } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deviceLabel, subscribeRequestSchema, unsubscribeRequestSchema } from "@/lib/push/schema";

/**
 * The push subscription API, kept in one route because the three actions share one
 * subject and one failure vocabulary.
 *
 * These are routes rather than server actions because the service worker calls
 * subscribe itself during pushsubscriptionchange, when the browser rotates an
 * endpoint with no page open. A server action is not reachable from that context.
 *
 * Writes go through the caller's own session, so row level security — not this
 * file — decides that a subscription belongs to the person saving it.
 */

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "key") return json({ error: "Not found." }, 404);
  // The VAPID public key is designed to be public; it identifies the sender to the
  // push service and grants nothing on its own.
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  if (!key) return json({ error: "Push is not configured." }, 503);
  return json({ key });
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "subscribe" && action !== "unsubscribe") return json({ error: "Not found." }, 404);

  const identity = await getCurrentIdentity();
  if (!identity) return json({ error: "Sign in again." }, 401);
  // The developer preview has no account to attach a device to, so it says so
  // rather than pretending a subscription was saved.
  if (identity.kind !== "supabase") return json({ error: "Push needs a connected account." }, 409);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 8192) return json({ error: "Request too large." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "Check the subscription details." }, 400);
  }

  const supabase = await createServerSupabaseClient();

  if (action === "unsubscribe") {
    const parsed = unsubscribeRequestSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Check the subscription details." }, 400);
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint).eq("user_id", identity.userId);
    if (error) return json({ error: "We could not turn off push on this device." }, 503);
    // push_enabled is the account-level switch the delivery trigger reads. Leaving it
    // on with no devices left would keep enqueuing deliveries that go nowhere.
    const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", identity.userId).is("disabled_at", null);
    if (!count) await supabase.from("notification_preferences").upsert({ user_id: identity.userId, push_enabled: false }, { onConflict: "user_id" });
    return json({ ok: true });
  }

  const parsed = subscribeRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Check the subscription details." }, 400);
  const { subscription, replaces, label } = parsed.data;

  // A rotated endpoint leaves a dead row behind; clearing it keeps the device list
  // honest and stops the dispatcher retrying an endpoint that no longer exists.
  if (replaces && replaces !== subscription.endpoint) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", replaces).eq("user_id", identity.userId);
  }

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: identity.userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    label: label ?? deviceLabel(request.headers.get("user-agent")),
  }, { onConflict: "endpoint" });
  if (error) return json({ error: "We could not turn on push for this device." }, 503);
  // Registering a device is the opt-in, so the account switch follows it rather than
  // asking the same person to agree twice in two places.
  await supabase.from("notification_preferences").upsert({ user_id: identity.userId, push_enabled: true }, { onConflict: "user_id" });
  return json({ ok: true });
}
