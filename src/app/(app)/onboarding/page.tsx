import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { ProfileStepForm, RelationshipStepForm, PartnerStepForm, ConnectStepForms } from "@/components/onboarding/onboarding-forms";
import { CopyCode } from "@/components/onboarding/copy-code";
import { completeDeveloperPairingAction, finishSoloOnboardingAction, readInvitePreview } from "@/app/actions/onboarding";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Cover, CoverSheet } from "@/components/app/cover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Set up your space" };

// Four input steps. `invite` and `complete` are outcomes, not steps: you
// cannot navigate back into the sequence from them, and numbering them is
// what made the old indicator show three dots for five screens and push
// activeIndex out of range, so every dot rendered filled.
const steps = ["profile", "relationship", "partner", "connect"] as const;

const copy: Record<string, { title: string; lede: string }> = {
  profile: { title: "Begin with you.", lede: "Your name and local time make every future plan feel like it belongs here." },
  relationship: { title: "Give your story a beginning.", lede: "One optional date is enough. The rest of your story can unfold naturally." },
  partner: { title: "And the person you’re doing this with.", lede: "Choose how they’ll appear to you here. This stays on your side: it’s yours, not theirs." },
  connect: { title: "Bring your person in.", lede: "This space opens for two. Create a code to share with them, or join with the one they sent you." },
  invite: { title: "Your invitation is ready.", lede: "Share this code with your partner yourself. It works once and expires after 30 minutes." },
  complete: { title: "Your little world is ready.", lede: "You’ve reached the starting line. Start with a wish, turn it into a plan, then keep what happened as a memory." },
};

/**
 * Setting up your space, in the Cover language (ADR-053): each step's title
 * sits on the cover with "Step 2 of 4" above it; the sheet opens with a
 * four-part progress bar, a line about the step, and its form. An invitation
 * shows its code in a raised panel with Copy. "I'll do this later" leaves the
 * setup at any step but the last.
 */
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  const asked = (await searchParams).step ?? "profile";
  const requestedStep = asked in copy ? asked : "profile";
  // Derived, so the indicator and the step list can never drift apart again.
  const activeIndex = Math.max(0, steps.indexOf(requestedStep as (typeof steps)[number]));
  const showProgress = (steps as readonly string[]).includes(requestedStep);

  let profile = { displayName: "", timezone: "UTC", avatarStyle: "rose", startedOn: "", isDeveloper: identity.kind === "developer" };
  let partner = { name: "", avatarStyle: "rose" };
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    profile = { displayName: state.displayName, timezone: state.timezone, avatarStyle: state.avatarStyle, startedOn: state.relationshipStartedOn, isDeveloper: true };
    partner = { name: state.partnerProfile?.displayName ?? "", avatarStyle: state.partnerProfile?.avatarStyle ?? "rose" };
  } else {
    const supabase = await createServerSupabaseClient();
    const [{ data }, { data: chosen }] = await Promise.all([
      supabase.from("profiles").select("display_name, timezone, relationship_started_on, avatar_style").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("partner_presentations").select("display_name, avatar_style").eq("owner_id", identity.userId).maybeSingle(),
    ]);
    profile = { displayName: data?.display_name ?? "", timezone: data?.timezone ?? "UTC", avatarStyle: data?.avatar_style ?? "rose", startedOn: data?.relationship_started_on ?? "", isDeveloper: false };
    partner = { name: chosen?.display_name ?? "", avatarStyle: chosen?.avatar_style ?? "rose" };
  }

  const inviteCode = requestedStep === "invite" ? await readInvitePreview() : null;
  // An invitation that has lapsed (or was never made) says so, rather than "ready" over "Expired".
  const { title, lede } = requestedStep === "invite" && !inviteCode
    ? { title: "This invitation has expired.", lede: "Codes last 30 minutes. Go back a step to create a fresh one, or carry on and invite them later from the partner page." }
    : copy[requestedStep];

  return (
    <>
      <Cover labelledBy="onboarding-title">
        <p className="text-[0.8125rem] font-semibold text-muted-foreground">
          {showProgress ? `Step ${activeIndex + 1} of ${steps.length}` : "Set up your private space"}
        </p>
        <h1 id="onboarding-title" className="mt-1.5 text-balance font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">{title}</h1>
      </Cover>

      <CoverSheet className="max-w-2xl">
        <div className="flex flex-col gap-5">
          {showProgress ? (
            <div role="img" aria-label={`Step ${activeIndex + 1} of ${steps.length}`} className="flex gap-1.5">
              {steps.map((step, index) => <span key={step} className={cn("h-1 flex-1 rounded-full", index <= activeIndex ? "bg-rose" : "bg-border")} />)}
            </div>
          ) : null}

          <p className="text-base leading-[1.7] text-foreground/90">{lede}</p>

          {requestedStep === "profile" ? <ProfileStepForm displayName={profile.displayName} timezone={profile.timezone} avatarStyle={profile.avatarStyle} /> : null}
          {requestedStep === "relationship" ? <RelationshipStepForm startedOn={profile.startedOn} /> : null}
          {requestedStep === "partner" ? <PartnerStepForm partnerName={partner.name} partnerAvatarStyle={partner.avatarStyle} /> : null}
          {requestedStep === "connect" ? <ConnectStepForms /> : null}

          {requestedStep === "invite" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 rounded-panel bg-secondary p-4">
                <span className="text-[0.8125rem] font-semibold text-primary">Your pairing code</span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-[2rem] leading-none tracking-[0.12em] tabular-nums">{inviteCode ?? "Expired"}</span>
                  {inviteCode ? <CopyCode code={inviteCode} /> : null}
                </div>
                <span className="flex items-center gap-2 text-sm leading-6 text-secondary-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />Only the person you give it to can join.</span>
              </div>
              {inviteCode ? null : <Button asChild variant="outline" className="w-full"><Link href="/onboarding?step=connect">Create a fresh code</Link></Button>}
              {profile.isDeveloper ? <form action={completeDeveloperPairingAction}><Button type="submit" size="lg" className="w-full">Add demo partner and continue</Button></form> : null}
              <form action={finishSoloOnboardingAction}><Button type="submit" variant="outline" className="w-full">Continue while I wait</Button></form>
            </div>
          ) : null}

          {requestedStep === "complete" ? (
            <div className="flex flex-col items-start gap-4">
              <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary"><HeartHandshake className="size-5" aria-hidden="true" /></span>
              <Button asChild size="lg" className="w-full"><Link href="/home">Enter Us Together</Link></Button>
            </div>
          ) : null}

          {requestedStep !== "complete" ? (
            <form action={finishSoloOnboardingAction} className="flex justify-center">
              <button type="submit" className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">I&rsquo;ll do this later</button>
            </form>
          ) : null}
        </div>
      </CoverSheet>
    </>
  );
}
