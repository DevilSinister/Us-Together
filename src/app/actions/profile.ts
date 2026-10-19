"use server";

import { redirect } from "next/navigation";
import { profileSchema } from "@/lib/auth/schemas";
import type { ActionState } from "@/lib/auth/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { avatarObjectPath, validateAvatarFile } from "@/lib/avatar/upload";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isValidTimeZone } from "@/lib/dream/schema";
import { planColumns } from "@/lib/plans/data";
import { reanchorWallClock } from "@/lib/time/zone";

const deviceZoneSchema = z.string().trim().min(1).max(64).refine(isValidTimeZone);

/**
 * Follow the zone the person's device reports.
 *
 * Profiles began on UTC and the app never asked, so a plan typed as 7:00 PM
 * was stored as 7:00 PM UTC. The first time a real zone replaces that default,
 * the person's own UTC-anchored plans move to the same wall-clock time in the
 * new zone, through the ordinary plan update path so versions bump and pending
 * reminders follow. Later moves (travel) change the display only: those plans
 * already carry the zone they were typed in.
 */
export async function syncDeviceTimeZoneAction(zone: string): Promise<{ changed: boolean; moved: number }> {
  const parsed = deviceZoneSchema.safeParse(zone);
  const identity = await getCurrentIdentity();
  if (!parsed.success || !identity) return { changed: false, moved: 0 };
  const next = parsed.data;

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    if (state.timezone === next) return { changed: false, moved: 0 };
    const repair = state.timezone === "UTC" && next !== "UTC";
    const moved = new Map<string, string>();
    const plans = state.plans.map(plan => {
      if (!repair || plan.timezone !== "UTC") return plan;
      const startsAt = reanchorWallClock(plan.startsAt, "UTC", next);
      moved.set(plan.id, startsAt);
      return { ...plan, startsAt, endsAt: plan.endsAt ? reanchorWallClock(plan.endsAt, "UTC", next) : null, timezone: next, version: (plan.version ?? 1) + 1 };
    });
    const planReminders = (state.planReminders ?? []).map(reminder => {
      const start = moved.get(reminder.plan_id);
      if (!start || reminder.state !== "pending") return reminder;
      const due = Date.parse(start) - reminder.offset_minutes * 60000;
      return { ...reminder, due_at: new Date(due).toISOString(), state: due > Date.now() ? "pending" : "cancelled" };
    });
    await writeDeveloperState({ ...state, timezone: next, plans, planReminders });
    revalidatePath("/", "layout");
    return { changed: true, moved: moved.size };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", identity.userId).maybeSingle();
  if (!profile || profile.timezone === next) return { changed: false, moved: 0 };
  const { error } = await supabase.from("profiles").update({ timezone: next }).eq("user_id", identity.userId);
  if (error) {
    console.error("timezone sync failed", { code: error.code });
    return { changed: false, moved: 0 };
  }

  let moved = 0;
  if (profile.timezone === "UTC" && next !== "UTC") {
    const { data: plans, error: readError } = await supabase.from("plans").select(planColumns).eq("created_by", identity.userId).eq("originating_timezone", "UTC");
    if (readError) console.error("timezone plan read failed", { code: readError.code });
    for (const plan of plans ?? []) {
      const { data, error: updateError } = await supabase.rpc("update_plan_details", { input: {
        planId: plan.id, version: plan.version, title: plan.title, description: plan.description, type: plan.type,
        starts_at: reanchorWallClock(plan.starts_at, "UTC", next),
        ends_at: plan.ends_at ? reanchorWallClock(plan.ends_at, "UTC", next) : null,
        timezone: next, location: plan.location, latitude: plan.latitude, longitude: plan.longitude,
        external_map_url: plan.external_map_url, budget_minor: plan.budget_minor, currency: plan.currency,
      } });
      if (updateError) console.error("timezone plan update failed", { code: updateError.code });
      else if ((data as { ok?: boolean } | null)?.ok) moved += 1;
    }
  }
  revalidatePath("/", "layout");
  return { changed: true, moved };
}

export async function updateProfileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };
  const check = validateAvatarFile(formData.get("avatar"));
  if (!check.ok) return { status: "error", message: check.message };
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, displayName: parsed.data.displayName, timezone: parsed.data.timezone });
    redirect("/home");
  }

  const supabase = await createServerSupabaseClient();

  // Same order as the partner picture: object first, then row, then the old
  // object. A failed row write leaves an orphan in the caller's own folder
  // rather than a profile pointing at nothing.
  let avatarPath: string | undefined;
  let previousPath: string | null = null;
  if (!check.empty) {
    const { data: current } = await supabase.from("profiles").select("avatar_path").eq("user_id", identity.userId).maybeSingle();
    previousPath = current?.avatar_path ?? null;
    avatarPath = avatarObjectPath(identity.userId, "me", check.extension);
    const bytes = new Uint8Array(await (formData.get("avatar") as File).arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, bytes, { contentType: check.mime, upsert: false });
    if (uploadError) return { status: "error", message: "We couldn't upload that photo. Try another image." };
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: identity.userId,
    display_name: parsed.data.displayName,
    timezone: parsed.data.timezone,
    ...(avatarPath ? { avatar_path: avatarPath } : {}),
  });

  if (error) return { status: "error", message: "We couldn't save your profile. Try again." };
  // Best effort: a stale object in your own private folder is harmless.
  if (avatarPath && previousPath && previousPath !== avatarPath) await supabase.storage.from("avatars").remove([previousPath]);
  revalidatePath("/", "layout");
  redirect("/home");
}
