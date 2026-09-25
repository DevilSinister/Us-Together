"use server";

import { redirect } from "next/navigation";
import { profileSchema } from "@/lib/auth/schemas";
import type { ActionState } from "@/lib/auth/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { avatarObjectPath, validateAvatarFile } from "@/lib/avatar/upload";
import { revalidatePath } from "next/cache";

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
