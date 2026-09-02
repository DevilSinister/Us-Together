import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, Sparkles } from "lucide-react";
import { completePlanAction } from "@/app/actions/dream";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plans" };

type PlanRow = { id: string; title: string; description: string | null; type: string; status: "planned" | "completed" | "cancelled"; starts_at: string; ends_at: string | null; originating_timezone: string; location: string | null; source_bucket_item_id: string | null };

export default async function PlansPage() {
  const identity = await getCurrentIdentity();
  let timezone = "UTC";
  let paired = false;
  let plans: PlanRow[] = [];
  let rememberedPlanIds = new Set<string>();

  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    timezone = state.timezone;
    paired = state.coupleStatus === "paired";
    plans = state.plans.map((plan) => ({ id: plan.id, title: plan.title, description: plan.description || null, type: plan.type, status: plan.status, starts_at: plan.startsAt, ends_at: plan.endsAt, originating_timezone: plan.timezone, location: plan.location || null, source_bucket_item_id: plan.sourceBucketId ?? null }));
    rememberedPlanIds = new Set(state.memories.flatMap((memory) => memory.sourcePlanId ? [memory.sourcePlanId] : []));
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("timezone").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
    ]);
    timezone = profile?.timezone ?? "UTC";
    paired = Boolean(membership);
    if (membership) {
      const [{ data: planRows }, { data: memoryRows }] = await Promise.all([
        supabase.from("plans").select("id,title,description,type,status,starts_at,ends_at,originating_timezone,location,source_bucket_item_id").eq("couple_id", membership.couple_id).order("starts_at", { ascending: true }).limit(50),
        supabase.from("memories").select("source_plan_id").eq("couple_id", membership.couple_id).not("source_plan_id", "is", null).limit(50),
      ]);
      plans = (planRows ?? []) as PlanRow[];
      rememberedPlanIds = new Set((memoryRows ?? []).flatMap((memory) => memory.source_plan_id ? [memory.source_plan_id] : []));
    }
  }

  const formatter = new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const upcoming = plans.filter((plan) => plan.status === "planned");
  const completed = plans.filter((plan) => plan.status === "completed");

  return (
    <div className="reveal-on-load">
      <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Shared time</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Plans that have somewhere to go.</h1><p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted-foreground">Keep the practical details together, then carry the experience forward as a memory.</p></div>{paired ? <Button asChild><Link href="/plans/new">Plan something <ArrowRight className="size-4" /></Link></Button> : null}</header>

      {!paired ? <section className="mt-10 rounded-[1rem] bg-secondary p-6 sm:p-8"><h2 className="font-display text-3xl">Plans open with your shared space.</h2><p className="mt-3 max-w-[60ch] leading-7 text-muted-foreground">Connect your partner first so every plan has a clear, private couple boundary.</p><Button asChild className="mt-6"><Link href="/pairing">Connect partner</Link></Button></section> : plans.length === 0 ? <section className="mt-12 grid gap-7 lg:grid-cols-[1fr_20rem]"><div><CalendarDays className="size-8 text-primary" /><h2 className="mt-5 font-display text-4xl">Start with one moment worth looking forward to.</h2><p className="mt-4 max-w-[60ch] leading-7 text-muted-foreground">A plan can be as small as coffee after work. Add when, where, and whatever will help the two of you arrive relaxed.</p><Button asChild className="mt-7"><Link href="/plans/new">Make the first plan</Link></Button></div><aside className="rounded-[1rem] bg-secondary p-6"><p className="text-sm font-semibold text-primary">Your timezone</p><p className="mt-3 font-display text-2xl">{timezone}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Times are stored as UTC and shown in your profile timezone.</p></aside></section> : <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]"><section aria-labelledby="upcoming-title"><div className="flex items-center justify-between"><h2 id="upcoming-title" className="font-display text-3xl">Coming up</h2><span className="text-sm text-muted-foreground">{upcoming.length} planned</span></div><div className="relationship-thread mt-5 space-y-2">{upcoming.length ? upcoming.map((plan) => <article id={plan.id} key={plan.id} className="relative flex gap-5 py-5"><span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-[0_6px_20px_-12px_rgba(80,20,40,.8)]"><CalendarDays className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl">{plan.title}</h3><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{plan.type}</span></div><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{formatter.format(new Date(plan.starts_at))}</p>{plan.location ? <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{plan.location}</p> : null}{plan.description ? <p className="mt-3 max-w-[65ch] leading-7 text-muted-foreground">{plan.description}</p> : null}{plan.source_bucket_item_id ? <Link href={`/bucket/${plan.source_bucket_item_id}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">From your bucket list</Link> : null}<form action={completePlanAction} className="mt-4"><input type="hidden" name="planId" value={plan.id} /><Button variant="outline" size="sm"><Check className="size-4" />Mark complete</Button></form></div></article>) : <p className="py-7 text-muted-foreground">Nothing scheduled right now. The next plan can be wonderfully small.</p>}</div></section><aside className="h-fit rounded-[1rem] bg-secondary p-6"><p className="text-sm font-semibold text-primary">Memory bridge</p><h2 className="mt-3 font-display text-3xl">{completed.length ? `${completed.length} completed ${completed.length === 1 ? "plan" : "plans"}` : "After the experience"}</h2><p className="mt-3 leading-7 text-muted-foreground">Completed plans stay recoverable until you choose which ones belong in your memories.</p></aside></div>}

      {completed.length ? <section className="mt-14 border-t pt-10"><h2 className="font-display text-3xl">Completed experiences</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{completed.map((plan) => <article key={plan.id} className="rounded-[1rem] border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{formatter.format(new Date(plan.starts_at))}</p><h3 className="mt-2 font-display text-2xl">{plan.title}</h3></div><Sparkles className="size-5 text-primary" /></div>{rememberedPlanIds.has(plan.id) ? <p className="mt-5 text-sm font-semibold text-success">Saved as a memory</p> : <Button asChild variant="outline" className="mt-5 w-full"><Link href={`/memories/new?plan=${plan.id}`}>Save this memory</Link></Button>}</article>)}</div></section> : null}
    </div>
  );
}
