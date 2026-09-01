"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/auth/types";
import { onboardingProfileSchema, pairingCodeSchema, relationshipSchema } from "@/lib/auth/schemas";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const INVITE_PREVIEW_COOKIE = "us_together_invite_preview";
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveOnboardingProfileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = onboardingProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!allowedAvatarTypes.has(avatar.type)) return { status: "error", message: "Choose a JPG, PNG, or WebP photo." };
    if (avatar.size > 2 * 1024 * 1024) return { status: "error", message: "Keep the profile photo under 2 MB." };
  }

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, displayName: parsed.data.displayName, timezone: parsed.data.timezone, avatarStyle: parsed.data.avatarStyle });
    redirect("/onboarding?step=relationship");
  }

  const supabase = await createServerSupabaseClient();
  let avatarPath: string | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    const extension = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
    avatarPath = `${identity.userId}/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await avatar.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, bytes, { contentType: avatar.type, upsert: false });
    if (uploadError) return { status: "error", message: "We couldn't upload that photo. Try another image." };
  }

  const profileUpdate: Record<string, string> = {
    user_id: identity.userId,
    display_name: parsed.data.displayName,
    timezone: parsed.data.timezone,
  };
  if (avatarPath) profileUpdate.avatar_path = avatarPath;
  const { error } = await supabase.from("profiles").upsert(profileUpdate);
  if (error) return { status: "error", message: "We couldn't save your profile. Try again." };
  redirect("/onboarding?step=relationship");
}

export async function saveRelationshipAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = relationshipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Choose a valid date.", fields: parsed.error.flatten().fieldErrors };
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, relationshipStartedOn: parsed.data.relationshipStartedOn });
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("profiles").update({ relationship_started_on: parsed.data.relationshipStartedOn || null }).eq("user_id", identity.userId);
    if (error) return { status: "error", message: "We couldn't save that date. Try again." };
  }
  redirect("/onboarding?step=connect");
}

export async function createCoupleAction(_previous: ActionState, _formData: FormData): Promise<ActionState> {
  void _previous;
  void _formData;
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };
  let inviteCode: string;

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    if (state.coupleStatus === "paired") return { status: "error", message: "Your demo partner is already connected." };
    inviteCode = String(100000 + Math.floor(Math.random() * 900000));
    await writeDeveloperState({ ...state, coupleStatus: "waiting", inviteCode });
  } else {
    const supabase = await createServerSupabaseClient();
    const [{ data: membership }, { data: profile }] = await Promise.all([
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
      supabase.from("profiles").select("relationship_started_on").eq("user_id", identity.userId).maybeSingle(),
    ]);
    const rpc = membership
      ? supabase.rpc("create_pairing_invite")
      : supabase.rpc("create_couple_with_invite", { started_on: profile?.relationship_started_on ?? null });
    const { data, error } = await rpc.single();
    if (error || !data) return { status: "error", message: error?.message ?? "We couldn't create your shared space." };
    inviteCode = String((data as { invite_code: string }).invite_code);
  }

  (await cookies()).set(INVITE_PREVIEW_COOKIE, inviteCode, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 30 });
  revalidatePath("/onboarding");
  redirect("/onboarding?step=invite");
}

export async function joinCoupleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pairingCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter the six-digit code.", fields: parsed.error.flatten().fieldErrors };
  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, coupleStatus: "paired", inviteCode: undefined, onboardingCompleted: true });
  } else {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("join_couple_by_code", { pairing_code: parsed.data.pairingCode });
    if (error) return { status: "error", message: error.message };
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", identity.userId);
  }
  redirect("/onboarding?step=complete");
}

export async function completeDeveloperPairingAction() {
  const identity = await getCurrentIdentity();
  if (identity?.kind !== "developer") return;
  const state = await readDeveloperState();
  await writeDeveloperState({ ...state, coupleStatus: "paired", inviteCode: undefined, onboardingCompleted: true });
  redirect("/onboarding?step=complete");
}

export async function finishSoloOnboardingAction() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, onboardingCompleted: true });
  } else {
    const supabase = await createServerSupabaseClient();
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", identity.userId);
  }
  redirect("/home");
}

export async function readInvitePreview() {
  return (await cookies()).get(INVITE_PREVIEW_COOKIE)?.value ?? null;
}
