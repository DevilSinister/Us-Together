import "server-only";
import { cache } from "react";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { isValidTimeZone } from "@/lib/dream/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * The zone the signed-in person reads times in, resolved once per request.
 *
 * Server components run on a host whose clock is UTC, so any `Intl` call
 * without an explicit zone silently formats for nobody. Pages that show an
 * instant ask here instead. The profile copy is kept in step with the device
 * by `TimeZoneSync`, so this is the person's local zone after their first visit.
 */
export const getViewerTimeZone = cache(async (): Promise<string> => {
  const identity = await getCurrentIdentity();
  if (!identity) return "UTC";
  if (identity.kind === "developer") {
    const zone = (await readDeveloperState()).timezone;
    return isValidTimeZone(zone) ? zone : "UTC";
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("profiles").select("timezone").eq("user_id", identity.userId).maybeSingle();
  return data?.timezone && isValidTimeZone(data.timezone) ? data.timezone : "UTC";
});
