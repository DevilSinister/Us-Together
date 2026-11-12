import type { Metadata } from "next";
import { ConnectStepForms } from "@/components/onboarding/onboarding-forms";
import { PairedConnectionActions, WaitingConnectionActions } from "@/components/pairing/connection-actions";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadIdentities } from "@/lib/avatar/identities";
import { Avatar } from "@/components/app/avatar";
import { PartnerStepForm } from "@/components/onboarding/onboarding-forms";
import { Button } from "@/components/ui/button";
import { forgetPartnerPresentationAction } from "@/app/actions/partner";

export const metadata: Metadata = { title: "Partner connection" };

export default async function PairingPage() {
  const identity = await getCurrentIdentity();
  let status: "solo" | "waiting" | "paired" = "solo";
  // The name and face come from the resolved identities - what you chose for
  // your partner in Settings, falling back to their own name - so this card
  // matches every other place they appear. Only the timezone is read here.
  const identities = await loadIdentities();
  let partner: { timezone: string } | null = null;
  // How your partner appears to you: your own record, never shown to them.
  let chosen = { name: "", avatarStyle: "rose" };
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    status = state.coupleStatus;
    if (state.partnerProfile) partner = { timezone: state.partnerProfile.timezone };
    chosen = { name: state.partnerProfile?.displayName ?? "", avatarStyle: state.partnerProfile?.avatarStyle ?? "rose" };
  }
  if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: membership }, { data: presentation }] = await Promise.all([
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
      supabase.from("partner_presentations").select("display_name, avatar_style").eq("owner_id", identity.userId).maybeSingle(),
    ]);
    chosen = { name: presentation?.display_name ?? "", avatarStyle: presentation?.avatar_style ?? "rose" };
    if (membership) {
      const { data: memberships } = await supabase.from("couple_memberships").select("user_id").eq("couple_id", membership.couple_id).is("left_at", null);
      const partnerId = memberships?.find((item) => item.user_id !== identity.userId)?.user_id;
      status = partnerId ? "paired" : "waiting";
      if (partnerId) {
        const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", partnerId).maybeSingle();
        if (profile) partner = { timezone: profile.timezone };
      }
    }
  }

  const paired = status === "paired";
  const waiting = status === "waiting";

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <p className="text-sm font-semibold text-primary">Partner connection</p>
      <h1 className="mt-3 font-display text-page-title">{paired ? "You’re connected." : waiting ? "Your invitation is waiting." : "Bring your two accounts together."}</h1>
      <p className="mt-5 mb-9 max-w-[62ch] leading-7 text-muted-foreground">{paired ? "This private space has reached its two-partner limit." : waiting ? "Your shared space is ready for its second account." : "One person creates the invitation; the other joins with its short-lived code."}</p>
      {paired ? (
        <div className="paper-surface rounded-[1.25rem] border bg-card p-6 sm:p-9">
          <div className="rounded-[1rem] bg-secondary p-7">
            <div className="flex items-center gap-4">
              <Avatar name={identities.partner.name} src={identities.partner.src} style={identities.partner.style} size="lg" eager />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Connected partner</p>
                <h2 className="mt-1 break-words font-display text-section-title">{identities.partner.name}</h2>
              </div>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">Timezone: {partner?.timezone ?? "Not provided"}. Shared access is granted only while both memberships are active.</p>
          </div>
          <section aria-labelledby="partner-presentation" id="partner" className="mt-8">
            <h2 id="partner-presentation" className="font-display text-section-title">How they appear to you</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {chosen.name ? "Yours, not theirs: they never see the name or picture you chose." : `Right now they appear as “${identities.partner.name}”, the name they chose.`}
            </p>
            <div className="mt-5">
              <PartnerStepForm partnerName={chosen.name} partnerAvatarStyle={chosen.avatarStyle} partnerAvatarSrc={identities.partner.src} returnTo="pairing" />
            </div>
            {chosen.name || identities.partner.src ? (
              <form action={forgetPartnerPresentationAction} className="mt-6 border-t pt-5">
                <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10 hover:text-danger">Forget these details</Button>
                <p className="mt-1 text-xs text-muted-foreground">Leaving a couple never erases this on its own; forgetting is always something you choose.</p>
              </form>
            ) : null}
          </section>
          <div className="mt-8"><PairedConnectionActions /></div>
        </div>
      ) : waiting ? (
        <div className="paper-surface rounded-[1.25rem] border bg-card p-6 sm:p-9"><WaitingConnectionActions /></div>
      ) : (
        <div className="paper-surface rounded-[1.25rem] border bg-card p-6 sm:p-9"><ConnectStepForms /></div>
      )}
    </div>
  );
}
