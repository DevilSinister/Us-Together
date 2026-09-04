import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/app/page-header";
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
    <div className="mx-auto max-w-xl reveal-on-load">
      <PageHeader
        scale="compact"
        rule={false}
        eyebrow="Your account"
        title="Make this space feel like yours."
        lede="Your timezone keeps future plans and letters honest. Only you can access these profile fields right now."
        className="pb-0"
      />
      <div className="mt-9 rounded-panel bg-card p-6 shadow-paper sm:p-8">
        <ProfileForm displayName={profile?.display_name ?? ""} timezone={profile?.timezone ?? "UTC"} />
      </div>
    </div>
  );
}
