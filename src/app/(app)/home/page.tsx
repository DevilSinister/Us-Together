import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CircleUserRound, HeartHandshake, Sparkles, type LucideIcon } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";

export const metadata: Metadata = { title: "Home" };

function getRelationshipDayCount(startedOn: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(`${startedOn}T00:00:00Z`).getTime()) / 86400000));
}

export default async function HomePage() {
  const identity = await getCurrentIdentity();
  let name: string | null = null;
  let onboardingCompleted = false;
  let coupleStatus: "solo" | "waiting" | "paired" = "solo";
  let relationshipStartedOn = "";

  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    name = state.displayName || null;
    onboardingCompleted = state.onboardingCompleted;
    coupleStatus = state.coupleStatus;
    relationshipStartedOn = state.relationshipStartedOn;
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("display_name, onboarding_completed, relationship_started_on").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
    ]);
    name = profile?.display_name ?? null;
    onboardingCompleted = profile?.onboarding_completed ?? false;
    relationshipStartedOn = profile?.relationship_started_on ?? "";
    coupleStatus = membership ? "waiting" : "solo";
    if (membership) {
      const { count } = await supabase.from("couple_memberships").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).is("left_at", null);
      if ((count ?? 0) >= 2) coupleStatus = "paired";
    }
  }

  if (!onboardingCompleted) {
    return (
      <div className="mx-auto max-w-3xl reveal-on-load">
        <p className="text-sm font-semibold text-primary">Your setup is waiting</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.03em] sm:text-6xl">A few details make this space yours.</h1>
        <p className="mt-5 max-w-[65ch] text-lg leading-8 text-muted-foreground">Add your name, local time, and—when you’re ready—the partner who will share this space.</p>
        <Button asChild className="mt-8"><Link href="/onboarding">Continue setup <ArrowRight className="size-4" /></Link></Button>
      </div>
    );
  }

  const dayCount = relationshipStartedOn ? getRelationshipDayCount(relationshipStartedOn) : null;
  const journey: Array<{ icon: LucideIcon; title: string; copy: string; href: string | null; action?: string }> = [
    { icon: CircleUserRound, title: "Your profile", copy: name ? `${name}, this private space begins with you.` : "Add the name and timezone your experience should use.", href: "/profile", action: "Open profile" },
    { icon: HeartHandshake, title: coupleStatus === "paired" ? "Partner connected" : coupleStatus === "waiting" ? "Invitation waiting" : "Connect your partner", copy: coupleStatus === "paired" ? "Two accounts now share this couple space." : "Use a private six-digit code to bring your accounts together.", href: "/pairing", action: "View connection" },
    { icon: CalendarDays, title: "Plan your first moment", copy: "Your first shared plan will live here soon.", href: null },
    { icon: Sparkles, title: "Keep the memory", copy: "Memories follow the first shared plan, so the story stays connected.", href: null },
  ];

  return (
    <div className="reveal-on-load">
      <p className="text-sm font-semibold text-primary">{name ? `Good to see you, ${name}` : "Welcome to Us Together"}</p>
      <h1 className="mt-3 max-w-3xl text-balance font-display text-5xl leading-[1.02] tracking-[-0.03em] sm:text-6xl">{dayCount === null ? "Your little world is ready for its first plan." : `${dayCount.toLocaleString()} days of us—and counting.`}</h1>
      <p className="mt-5 max-w-[68ch] text-lg leading-8 text-muted-foreground">A wish can become a plan here, and a plan can come home as a memory.</p>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="journey-title">
          <h2 id="journey-title" className="font-display text-3xl">Your relationship thread</h2>
          <div className="relationship-thread mt-5 space-y-1">
            {journey.map(({ icon: Icon, title, copy, href, action }) => (
              <article key={title} className="relative flex gap-5 py-5">
                <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-[0_6px_20px_-12px_rgba(80,20,40,.8)]"><Icon className="size-4" /></span>
                <div className="min-w-0"><h3 className="font-display text-2xl">{title}</h3><p className="mt-1 leading-7 text-muted-foreground">{copy}</p>{href ? <Link href={href} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{action} <ArrowRight className="size-4" /></Link> : <p className="mt-3 text-xs font-semibold text-muted-foreground">Not active yet</p>}</div>
              </article>
            ))}
          </div>
        </section>
        <aside className="h-fit rounded-[1rem] bg-secondary p-6 sm:p-7">
          <p className="text-sm font-semibold text-primary">Private by default</p>
          <h2 className="mt-3 font-display text-3xl">{coupleStatus === "paired" ? "Shared by membership, not by guesswork." : "Nothing is shared until you choose a partner."}</h2>
          <p className="mt-4 leading-7 text-muted-foreground">Your personal details stay yours. Shared features open only through an active couple membership.</p>
          <Button asChild variant="outline" className="mt-6 w-full"><Link href="/profile">Review profile</Link></Button>
        </aside>
      </div>
    </div>
  );
}
