"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/auth/types";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveBucketPlan, saveBucketMemory } from "@/lib/bucket/conversion";
import { isValidTimeZone, memorySchema, moneyToMinorUnits, planSchema, zonedLocalToUtc } from "@/lib/dream/schema";

async function activeCoupleId(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", userId).is("left_at", null).maybeSingle();
  if (!data) return null;
  return data.couple_id;
}

export async function createPlanAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Check the highlighted details.", fields: parsed.error.flatten().fieldErrors };
  if (!isValidTimeZone(parsed.data.timezone)) return { status: "error", message: "Choose a valid IANA timezone.", fields: { timezone: ["Use a timezone such as Asia/Karachi or Europe/London."] } };

  let startsAt: string;
  let endsAt: string | null;
  try {
    startsAt = zonedLocalToUtc(parsed.data.startsAt, parsed.data.timezone, parsed.data.occurrence);
    endsAt = parsed.data.endsAt ? zonedLocalToUtc(parsed.data.endsAt, parsed.data.timezone, parsed.data.occurrence) : null;
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Choose a valid local time.", fields: { startsAt: ["Review the date, time, and timezone."] } };
  }
  if (endsAt && endsAt < startsAt) return { status: "error", message: "The end must be after the start.", fields: { endsAt: ["Choose a later end time."] } };

  if (parsed.data.sourceBucketId) {
    let id: string;
    try { id = await saveBucketPlan(parsed.data.sourceBucketId, parsed.data, startsAt, endsAt); }
    catch (error) { return { status: "error", message: error instanceof Error ? error.message : "We couldn't save the plan." }; }
    revalidatePath("/bucket"); revalidatePath(`/bucket/${parsed.data.sourceBucketId}`); revalidatePath("/plans"); revalidatePath("/home");
    redirect(`/plans/${id}`);
  }

  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    if (state.coupleStatus === "solo") return { status: "error", message: "Create your shared space before adding plans." };
    const id = crypto.randomUUID();
    await writeDeveloperState({
      ...state,
      plans: [{ id, title: parsed.data.title, description: parsed.data.description ?? "", type: parsed.data.type, status: "planned" as const, startsAt, endsAt, timezone: parsed.data.timezone, location: parsed.data.location ?? "", version: 1, latitude: parsed.data.latitude, longitude: parsed.data.longitude, mapUrl: parsed.data.mapUrl, budgetMinor: moneyToMinorUnits(parsed.data.budget), currency: parsed.data.currency || null }, ...state.plans].slice(0, 20),
    });
    redirect(`/plans/${id}`);
  }

  const coupleId = await activeCoupleId(identity.userId);
  if (!coupleId) return { status: "error", message: "Connect your partner before adding shared plans." };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("plans").insert({
    couple_id: coupleId,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    starts_at: startsAt,
    ends_at: endsAt,
    originating_timezone: parsed.data.timezone,
    location: parsed.data.location,
    latitude: parsed.data.latitude, longitude: parsed.data.longitude, external_map_url: parsed.data.mapUrl,
    budget_minor: moneyToMinorUnits(parsed.data.budget),
    currency: parsed.data.currency || null,
  }).select("id").single();
  if (error || !data) return { status: "error", message: "We couldn't save this plan. Try again." };
  revalidatePath("/plans");
  revalidatePath("/home");
  redirect(`/plans/${data.id}`);
}

function finishMemory(id:string, inline:string):ActionState { revalidatePath("/calendar"); if(inline==="true")return {status:"success",savedId:id}; redirect("/memories/"+id); }

export async function createMemoryAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = memorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Check the highlighted details.", fields: parsed.error.flatten().fieldErrors };
  if (parsed.data.sourceBucketId) {
    if (parsed.data.sourcePlanId) return { status: "error", message: "Choose one source for this memory." };
    let id: string;
    try { id = await saveBucketMemory(parsed.data.sourceBucketId, parsed.data); }
    catch (error) { return { status: "error", message: error instanceof Error ? error.message : "We couldn't save the memory." }; }
    revalidatePath("/bucket"); revalidatePath("/memories"); revalidatePath("/home");
    return finishMemory(id, parsed.data.returnCreated);
  }
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    if (state.coupleStatus === "solo") return { status: "error", message: "Connect your partner before adding shared memories." };
    const sourcePlan = parsed.data.sourcePlanId ? state.plans.find((plan) => plan.id === parsed.data.sourcePlanId) : null;
    if (parsed.data.sourcePlanId && sourcePlan?.status !== "completed") return { status: "error", message: "Complete the plan before saving it as a memory." };
    const existing = sourcePlan ? state.memories.find((memory) => memory.sourcePlanId === sourcePlan.id) : null;
    if (existing) return finishMemory(existing.id, parsed.data.returnCreated);
    const id = crypto.randomUUID();
    await writeDeveloperState({
      ...state,
      memories: [{ id, title: parsed.data.title, description: parsed.data.description ?? "", memoryDate: parsed.data.memoryDate, location: parsed.data.location ?? "", rating: parsed.data.rating === "" ? null : parsed.data.rating, favorite: parsed.data.favorite, sourcePlanId: parsed.data.sourcePlanId, sourceBucketId: sourcePlan?.sourceBucketId }, ...state.memories].slice(0, 30),
    });
    return finishMemory(id, parsed.data.returnCreated);
  }

  const supabase = await createServerSupabaseClient();
  let sourceBucketId: string | null = null;
  let coupleId = await activeCoupleId(identity.userId);
  if (!coupleId) return { status: "error", message: "Connect your partner before adding shared memories." };
  if (parsed.data.sourcePlanId) {
    const { data: plan } = await supabase.from("plans").select("id, couple_id, status, source_bucket_item_id").eq("id", parsed.data.sourcePlanId).maybeSingle();
    if (!plan) return { status: "error", message: "That plan is no longer available." };
    if (plan.status !== "completed") return { status: "error", message: "Complete the plan before saving it as a memory." };
    coupleId = plan.couple_id;
    sourceBucketId = plan.source_bucket_item_id;
    const { data: existing } = await supabase.from("memories").select("id").eq("source_plan_id", plan.id).maybeSingle();
    if (existing) return finishMemory(existing.id, parsed.data.returnCreated);
  }

  const { data, error } = await supabase.from("memories").insert({
    couple_id: coupleId,
    source_plan_id: parsed.data.sourcePlanId,
    source_bucket_item_id: sourceBucketId,
    title: parsed.data.title,
    description: parsed.data.description,
    memory_date: parsed.data.memoryDate,
    location: parsed.data.location,
    rating: parsed.data.rating === "" ? null : parsed.data.rating,
    is_favorite: parsed.data.favorite,
  }).select("id").single();
  if (error?.code === "23505" && parsed.data.sourcePlanId) {
    const { data: existing } = await supabase.from("memories").select("id").eq("source_plan_id", parsed.data.sourcePlanId).maybeSingle();
    if (existing) return finishMemory(existing.id, parsed.data.returnCreated);
  }
  if (error || !data) return { status: "error", message: "We couldn't save this memory. Try again." };
  revalidatePath("/memories");
  revalidatePath("/plans");
  revalidatePath("/home");
  return finishMemory(data.id, parsed.data.returnCreated);
}
