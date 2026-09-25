import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { PartnerStepForm } from "@/components/onboarding/onboarding-forms";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { loadIdentities } from "@/lib/avatar/identities";
import { forgetPartnerPresentationAction } from "@/app/actions/partner";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const identity = await getCurrentIdentity();
  let profile: { display_name: string | null; timezone: string } | null = null;
  let partner = { name: "", avatarStyle: "rose" };
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    profile = { display_name: state.displayName, timezone: state.timezone };
    partner = { name: state.partnerProfile?.displayName ?? "", avatarStyle: state.partnerProfile?.avatarStyle ?? "rose" };
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [result, chosen] = await Promise.all([
      supabase.from("profiles").select("display_name, timezone").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("partner_presentations").select("display_name, avatar_style").eq("owner_id", identity.userId).maybeSingle(),
    ]);
    profile = result.data;
    partner = { name: chosen.data?.display_name ?? "", avatarStyle: chosen.data?.avatar_style ?? "rose" };
  }

  const identities = await loadIdentities();

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

      <section aria-labelledby="profile-you" className="mt-9 rounded-panel bg-card p-6 shadow-paper sm:p-8">
        {/* The photo editor below carries the face, so the heading does not repeat it. */}
        <h2 id="profile-you" className="font-display text-2xl">You</h2>
        <div className="mt-6">
          <ProfileForm displayName={profile?.display_name ?? ""} timezone={profile?.timezone ?? "UTC"} avatarSrc={identities.me.src} />
        </div>
      </section>

      {/*
        How your partner appears to you. This is your own record, not theirs:
        the name and picture live on your side of the couple and they never see
        them. Editing it here reuses the onboarding step, so there is one editor
        rather than two that can drift.
      */}
      <section aria-labelledby="profile-partner" id="partner" className="mt-8 rounded-panel bg-card p-6 shadow-paper sm:p-8">
        <div>
          <div className="min-w-0">
            <h2 id="profile-partner" className="font-display text-2xl">Your partner</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {partner.name
                ? "This is how they appear to you everywhere in the app. It is yours, not theirs: they never see the name or picture you chose."
                : `Right now they appear as “${identities.partner.name}”, the name they chose.`}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <PartnerStepForm partnerName={partner.name} partnerAvatarStyle={partner.avatarStyle} partnerAvatarSrc={identities.partner.src} returnTo="profile" />
        </div>

        {partner.name || identities.partner.src ? (
          <form action={forgetPartnerPresentationAction} className="mt-6 border-t pt-5">
            <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10 hover:text-danger">
              Forget these details
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">Leaving a couple never erases this on its own; forgetting is always something you choose.</p>
          </form>
        ) : null}
      </section>
    </div>
  );
}
