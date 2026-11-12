import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { notificationHref } from "@/lib/notifications/links";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Opening a notification: marks it read for the signed-in recipient and goes
 * where it points. The address is built from the stored row, never taken
 * from the request, so this cannot be used to send anyone elsewhere. Marking
 * read is idempotent and reveals nothing, which is why a plain link can do it;
 * the inbox renders it without prefetch so a hover never marks anything.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return go("/notifications");
  const identity = await getCurrentIdentity();
  if (!identity) return go("/sign-in");

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    const found = state.notifications.find((item) => item.id === parsed.data);
    if (!found) return go("/notifications");
    if (!found.readAt) await writeDeveloperState({ ...state, notifications: state.notifications.map((item) => item.id === found.id ? { ...item, readAt: new Date().toISOString() } : item) });
    return go(notificationHref({ category: found.category, target_type: found.targetType, target_id: found.targetId }));
  }

  const supabase = await createServerSupabaseClient();
  const { data: row } = await supabase.from("notifications").select("category,target_type,target_id,read_at").eq("id", parsed.data).eq("recipient_id", identity.userId).maybeSingle();
  if (!row) return go("/notifications");
  if (!row.read_at) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", parsed.data).eq("recipient_id", identity.userId);
  return go(notificationHref(row));
}
