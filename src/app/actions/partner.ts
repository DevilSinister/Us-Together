"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/auth/types";
import { partnerPresentationSchema } from "@/lib/auth/schemas";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { avatarObjectPath, validateAvatarFile } from "@/lib/avatar/upload";

/**
 * Save the name and picture you chose for your partner.
 *
 * Everything written here belongs to the signed-in account: the row is theirs
 * and the object lands in their own storage folder. Nothing about the partner's
 * account is read or written, which is why this needs no membership check and
 * works before pairing has even happened.
 *
 * The upload is ordered deliberately - object first, then row. If the row write
 * fails, the orphan sits in the caller's own private folder where it is
 * harmless and deletable by them; the reverse order would lose the picture on a
 * failed update.
 */
export async function savePartnerPresentationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = partnerPresentationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };

  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };

  const check = validateAvatarFile(formData.get("partnerAvatar"));
  if (!check.ok) return { status: "error", message: check.message };

  const name = parsed.data.partnerName.trim();
  // Opened from onboarding it continues the flow; opened from the profile it
  // returns there, so there is one editor rather than two.
  const back = formData.get("returnTo") === "profile" ? "/profile" : "/onboarding?step=connect";

  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({
      ...state,
      partnerProfile: {
        displayName: name || state.partnerProfile?.displayName || "",
        timezone: state.partnerProfile?.timezone ?? state.timezone,
        avatarStyle: parsed.data.partnerAvatarStyle,
      },
    });
    redirect(back);
  }

  const supabase = await createServerSupabaseClient();
  let avatarPath: string | undefined;
  let previousPath: string | null = null;
  if (!check.empty) {
    const { data: current } = await supabase.from("partner_presentations").select("avatar_path").eq("owner_id", identity.userId).maybeSingle();
    previousPath = current?.avatar_path ?? null;
    const file = formData.get("partnerAvatar") as File;
    avatarPath = avatarObjectPath(identity.userId, "partner", check.extension);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage.from("avatars").upload(avatarPath, bytes, { contentType: check.mime, upsert: false });
    if (error) return { status: "error", message: "We couldn't upload that photo. Try another image." };
  }

  const row: { owner_id: string; display_name: string | null; avatar_style: string; avatar_path?: string } = {
    owner_id: identity.userId,
    display_name: name || null,
    avatar_style: parsed.data.partnerAvatarStyle,
  };
  if (avatarPath) row.avatar_path = avatarPath;

  const { error } = await supabase.from("partner_presentations").upsert(row, { onConflict: "owner_id" });
  if (error) return { status: "error", message: "We couldn't save these details. Try again." };
  // The replaced picture is removed only after the row points at the new one.
  if (avatarPath && previousPath && previousPath !== avatarPath) await supabase.storage.from("avatars").remove([previousPath]);

  revalidatePath("/", "layout");
  redirect(back);
}

/** Forget the name and picture you chose. Deliberately explicit, never a side effect of unpairing. */
export async function forgetPartnerPresentationAction(): Promise<void> {
  const identity = await getCurrentIdentity();
  if (identity?.kind !== "supabase") return;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("partner_presentations").select("avatar_path").eq("owner_id", identity.userId).maybeSingle();
  await supabase.from("partner_presentations").delete().eq("owner_id", identity.userId);
  if (data?.avatar_path) await supabase.storage.from("avatars").remove([data.avatar_path]);
  revalidatePath("/", "layout");
}
