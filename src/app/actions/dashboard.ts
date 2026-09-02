"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/auth/types";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { milestoneSchema } from "@/lib/dashboard/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const notificationIdSchema = z.string().uuid();

async function activePairedCoupleId(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", userId).is("left_at", null).maybeSingle();
  if (!data) return null;
  const { count } = await supabase.from("couple_memberships").select("id", { count: "exact", head: true }).eq("couple_id", data.couple_id).is("left_at", null);
  return (count ?? 0) === 2 ? data.couple_id : null;
}

export async function createMilestoneAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Check the highlighted details.", fields: parsed.error.flatten().fieldErrors };
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    if (state.coupleStatus !== "paired") return { status: "error", message: "Connect your partner before adding shared milestones." };
    const id = crypto.randomUUID();
    await writeDeveloperState({
      ...state,
      milestones: [{ id, title: parsed.data.title, description: parsed.data.description ?? "", type: parsed.data.type, milestoneDate: parsed.data.milestoneDate, featured: parsed.data.featured, location: parsed.data.location ?? "" }, ...state.milestones].slice(0, 50),
    });
    revalidatePath("/calendar");
    if(parsed.data.returnCreated==="true")return {status:"success",savedId:id};
    redirect(`/milestones/${id}`);
  }

  const coupleId = await activePairedCoupleId(identity.userId);
  if (!coupleId) return { status: "error", message: "Connect your partner before adding shared milestones." };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("milestones").insert({
    couple_id: coupleId,
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    milestone_date: parsed.data.milestoneDate,
    location: parsed.data.location,
    is_featured: parsed.data.featured,
  }).select("id").single();
  if (error || !data) return { status: "error", message: "We couldn't save this milestone. Try again." };
  revalidatePath("/milestones");
  revalidatePath("/home");
  revalidatePath("/calendar");
  if(parsed.data.returnCreated==="true")return {status:"success",savedId:data.id};
  redirect(`/milestones/${data.id}`);
}

export async function markNotificationReadAction(formData: FormData) {
  const parsed = notificationIdSchema.safeParse(formData.get("notificationId"));
  if (!parsed.success) return;
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, notifications: state.notifications.map((notification) => notification.id === parsed.data ? { ...notification, readAt: new Date().toISOString() } : notification) });
  } else {
    const supabase = await createServerSupabaseClient();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", parsed.data).eq("recipient_id", identity.userId);
  }
  revalidatePath("/home");
  revalidatePath("/notifications");
}

export async function updateNotificationPreferencesAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };
  const values = {
    inAppEnabled: formData.get("inAppEnabled") === "on",
    plansEnabled: formData.get("plansEnabled") === "on",
    memoriesEnabled: formData.get("memoriesEnabled") === "on",
    milestonesEnabled: formData.get("milestonesEnabled") === "on",
    notesEnabled: formData.get("notesEnabled") === "on",
  };
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, notificationPreferences: values });
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: identity.userId,
      in_app_enabled: values.inAppEnabled,
      plans_enabled: values.plansEnabled,
      memories_enabled: values.memoriesEnabled,
      milestones_enabled: values.milestonesEnabled,
      notes_enabled: values.notesEnabled,
    }, { onConflict: "user_id" });
    if (error) return { status: "error", message: "We couldn't update your notification preferences." };
  }
  revalidatePath("/notifications");
  revalidatePath("/home");
  return { status: "success", message: "Notification preferences saved." };
}
