import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const identity = await getCurrentIdentity();
  let profile: { display_name: string | null; timezone: string } | null = null;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    profile = { display_name: state.displayName, timezone: state.timezone };
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from("profiles").select("display_name, timezone").eq("user_id", identity.userId).maybeSingle();
    profile = result.data;
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold text-primary">Your account</p>
      <h1 className="mt-3 font-display text-5xl tracking-[-0.03em]">Make this space feel like yours.</h1>
      <p className="mt-5 mb-9 leading-7 text-muted-foreground">Your timezone keeps future plans and letters honest. Only you can access these profile fields right now.</p>
      <div className="rounded-[1rem] bg-card p-6 shadow-[0_20px_55px_-42px_rgba(58,25,34,.55)] sm:p-8"><ProfileForm displayName={profile?.display_name ?? ""} timezone={profile?.timezone ?? "UTC"} /></div>
    </div>
  );
}
