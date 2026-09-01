"use server";

import { redirect } from "next/navigation";
import { profileSchema } from "@/lib/auth/schemas";
import type { ActionState } from "@/lib/auth/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";

export async function updateProfileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  const identity = await getCurrentIdentity();
  if (!identity) return { status: "error", message: "Your session expired. Sign in again." };
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    await writeDeveloperState({ ...state, displayName: parsed.data.displayName, timezone: parsed.data.timezone });
    redirect("/home");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("profiles").upsert({
    user_id: identity.userId,
    display_name: parsed.data.displayName,
    timezone: parsed.data.timezone,
  });

  if (error) return { status: "error", message: "We couldn't save your profile. Try again." };
  redirect("/home");
}
