import type { Metadata } from "next";
import { ConnectStepForms } from "@/components/onboarding/onboarding-forms";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner connection" };

export default async function PairingPage() {
  const identity = await getCurrentIdentity();
  let paired = false;
  if (identity?.kind === "developer") paired = (await readDeveloperState()).coupleStatus === "paired";
  if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data: membership } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle();
    if (membership) {
      const { count } = await supabase.from("couple_memberships").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).is("left_at", null);
      paired = (count ?? 0) >= 2;
    }
  }

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <p className="text-sm font-semibold text-primary">Partner connection</p>
      <h1 className="mt-3 font-display text-5xl tracking-[-0.03em]">{paired ? "You’re connected." : "Bring your two accounts together."}</h1>
      <p className="mt-5 mb-9 max-w-[62ch] leading-7 text-muted-foreground">{paired ? "This private space has reached its two-partner limit. Pairing details and leave controls will live here." : "One person creates the invitation; the other joins with its short-lived code."}</p>
      {paired ? <div className="rounded-[1rem] bg-secondary p-7"><p className="font-display text-2xl">Two partners, one private space.</p><p className="mt-3 leading-7 text-muted-foreground">Your shared features can now open without exposing either account to another couple.</p></div> : <div className="paper-surface rounded-[1.25rem] border bg-card p-6 sm:p-9"><ConnectStepForms /></div>}
    </div>
  );
}
