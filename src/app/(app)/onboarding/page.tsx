import type { Metadata } from "next";
import Link from "next/link";
import { Check, HeartHandshake, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { ProfileStepForm, RelationshipStepForm, ConnectStepForms } from "@/components/onboarding/onboarding-forms";
import { completeDeveloperPairingAction, finishSoloOnboardingAction, readInvitePreview } from "@/app/actions/onboarding";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Set up your space" };

const steps = ["profile", "relationship", "connect"] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  const requestedStep = (await searchParams).step ?? "profile";
  const activeIndex = requestedStep === "relationship" ? 1 : requestedStep === "connect" || requestedStep === "invite" ? 2 : requestedStep === "complete" ? 3 : 0;

  let profile = { displayName: "", timezone: "UTC", avatarStyle: "rose", startedOn: "", isDeveloper: identity.kind === "developer" };
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    profile = { displayName: state.displayName, timezone: state.timezone, avatarStyle: state.avatarStyle, startedOn: state.relationshipStartedOn, isDeveloper: true };
  } else {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("profiles").select("display_name, timezone, relationship_started_on").eq("user_id", identity.userId).maybeSingle();
    profile = { displayName: data?.display_name ?? "", timezone: data?.timezone ?? "UTC", avatarStyle: "rose", startedOn: data?.relationship_started_on ?? "", isDeveloper: false };
  }

  const inviteCode = requestedStep === "invite" ? await readInvitePreview() : null;

  return (
    <div className="mx-auto max-w-3xl reveal-on-load">
      <div className="mb-9 flex items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">Set up your private space</p><p className="mt-1 text-sm text-muted-foreground">About two minutes</p></div>
        <ol className="flex items-center gap-2" aria-label="Onboarding progress">{steps.map((step, index) => <li key={step} className={`grid size-8 place-items-center rounded-full text-xs font-bold ${index <= activeIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`} aria-current={index === activeIndex ? "step" : undefined}>{index < activeIndex ? <Check className="size-4" /> : index + 1}</li>)}</ol>
      </div>

      <section className="paper-surface overflow-hidden rounded-[1.25rem] border bg-card">
        <div className="border-b px-6 py-7 sm:px-10">
          {requestedStep === "profile" ? <><h1 className="font-display text-4xl tracking-[-0.03em] sm:text-5xl">Begin with you.</h1><p className="mt-3 max-w-[58ch] leading-7 text-muted-foreground">Your name and local time make every future plan feel like it belongs here.</p></> : null}
          {requestedStep === "relationship" ? <><h1 className="font-display text-4xl tracking-[-0.03em] sm:text-5xl">Give your story a beginning.</h1><p className="mt-3 max-w-[58ch] leading-7 text-muted-foreground">One optional date is enough. The rest of your story can unfold naturally.</p></> : null}
          {requestedStep === "connect" ? <><h1 className="font-display text-4xl tracking-[-0.03em] sm:text-5xl">Now, make it yours together.</h1><p className="mt-3 max-w-[58ch] leading-7 text-muted-foreground">Invite a partner or join the space they already started.</p></> : null}
          {requestedStep === "invite" ? <><h1 className="font-display text-4xl tracking-[-0.03em] sm:text-5xl">Your invitation is ready.</h1><p className="mt-3 max-w-[58ch] leading-7 text-muted-foreground">Share this code directly with your partner. It expires after 30 minutes.</p></> : null}
          {requestedStep === "complete" ? <><h1 className="font-display text-4xl tracking-[-0.03em] sm:text-5xl">Your little world is ready.</h1><p className="mt-3 max-w-[58ch] leading-7 text-muted-foreground">You’ve reached the starting line. Your first shared plan comes next.</p></> : null}
        </div>
        <div className="px-6 py-8 sm:px-10">
          {requestedStep === "profile" ? <ProfileStepForm displayName={profile.displayName} timezone={profile.timezone} avatarStyle={profile.avatarStyle} /> : null}
          {requestedStep === "relationship" ? <RelationshipStepForm startedOn={profile.startedOn} /> : null}
          {requestedStep === "connect" ? <ConnectStepForms /> : null}
          {requestedStep === "invite" ? <div className="text-center"><div className="mx-auto max-w-md rounded-[1rem] bg-secondary px-6 py-8"><p className="text-sm font-semibold text-primary">Pairing code</p><p className="mt-3 font-display text-5xl tracking-[0.22em] sm:text-6xl">{inviteCode ?? "Expired"}</p><p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4" />Single use · two partners maximum</p></div>{profile.isDeveloper ? <form action={completeDeveloperPairingAction} className="mt-6"><Button type="submit" className="w-full">Add demo partner and continue</Button></form> : null}<form action={finishSoloOnboardingAction} className="mt-3"><Button type="submit" variant="ghost" className="w-full">Continue while I wait</Button></form></div> : null}
          {requestedStep === "complete" ? <div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary"><HeartHandshake className="size-7" /></span><p className="mx-auto mt-5 max-w-md leading-7 text-muted-foreground">Start with a wish, turn it into a plan, then keep what happened as a memory.</p><Button asChild className="mt-7 w-full sm:w-auto"><Link href="/home">Enter Us Together</Link></Button></div> : null}
        </div>
      </section>
      {requestedStep !== "complete" ? <form action={finishSoloOnboardingAction} className="mt-5 text-center"><button type="submit" className="min-h-11 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">Skip for now</button></form> : null}
    </div>
  );
}
