"use server";

import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Only the signed-in recipient's unread count crosses into navigation chrome. */
export async function getUnreadNotificationCount(): Promise<number> {
  const identity = await getCurrentIdentity();
  if (!identity) return 0;

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    return state.notifications.filter((notification) => !notification.readAt).length;
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", identity.userId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
