import type { Metadata } from "next";
import { ConnectStepForms } from "@/components/onboarding/onboarding-forms";
import { PairedConnectionActions, WaitingConnectionActions } from "@/components/pairing/connection-actions";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner connection" };

export default async function PairingPage() {
  const identity = await getCurrentIdentity();
  let status: "solo" | "waiting" | "paired" = "solo";
  let partner: { displayName: string; timezone: string } | null = null;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    status = state.coupleStatus;
    if (state.partnerProfile) partner = { displayName: state.partnerProfile.displayName, timezone: state.partnerProfile.timezone };
  }
  if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data: membership } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle();
    if (membership) {
      const { data: memberships } = await supabase.from("couple_memberships").select("user_id").eq("couple_id", membership.couple_id).is("left_at", null);
      const partnerId = memberships?.find((item) => item.user_id !== identity.userId)?.user_id;
      status = partnerId ? "paired" : "waiting";
      if (partnerId) {
        const { data: profile } = await supabase.from("profiles").select("display_name, timezone").eq("user_id", partnerId).maybeSingle();
        if (profile) partner = { displayName: profile.display_name || "Your partner", timezone: profile.timezone };
      }
    }
  }

  const paired = status === "paired";
  const waiting = status === "waiting";

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <p className="text-sm font-semibold text-primary">Partner connection</p>
      <h1 className="mt-3 font-display text-5xl tracking-[-0.03em]">{paired ? "You’re connected." : waiting ? "Your invitation is waiting." : "Bring your two accounts together."}</h1>
      <p className="mt-5 mb-9 max-w-[62ch] leading-7 text-muted-foreground">{paired ? "This private space has reached its two-partner limit." : waiting ? "Your shared space is ready for its second account." : "One person creates the invitation; the other joins with its short-lived code."}</p>
      {paired ? (
        <div className="paper-surface rounded-[1.25rem] border bg-card p-6 sm:p-9">
          <div className="rounded-[1rem] bg-secondary p-7">
            <p className="text-sm font-semibold text-primary">Connected partner</p>
            <h2 className="mt-2 font-display text-3xl">{partner?.displayName ?? "Your partner"}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">Timezone: {partner?.timezone ?? "Not provided"}. Shared access is granted only while both memberships are active.</p>
          </div>
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
