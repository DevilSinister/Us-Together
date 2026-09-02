import {EntryPreview} from "@/components/entries/entry-preview";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarHeart, Flag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Milestones" };
type MilestoneRow = { id: string; title: string; description: string | null; type: string; milestone_date: string; is_featured: boolean };

export default async function MilestonesPage() {
  const identity = await getCurrentIdentity();
  let paired = false;
  let previewSession: string | undefined;
  let milestones: MilestoneRow[] = [];
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    paired = state.coupleStatus === "paired";
    previewSession=state.bucketSessionId;
    milestones = state.milestones.map((item) => ({ id: item.id, title: item.title, description: item.description || null, type: item.type, milestone_date: item.milestoneDate, is_featured: item.featured }));
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data: membership } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle();
    if (membership) {
      const { count } = await supabase.from("couple_memberships").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).is("left_at", null);
      paired = count === 2;
      if (paired) {
        const { data } = await supabase.from("milestones").select("id,title,description,type,milestone_date,is_featured").eq("couple_id", membership.couple_id).order("milestone_date", { ascending: false }).order("id", { ascending: false }).limit(50);
        milestones = (data ?? []) as MilestoneRow[];
      }
    }
  }
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
  return <div className="reveal-on-load"><header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Dates that became part of you</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Your shared milestones.</h1><p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted-foreground">Anniversaries, beginnings, brave choices, and the small dates only the two of you understand.</p></div>{paired ? <Button asChild><Link href="/milestones/new">Add milestone <ArrowRight className="size-4" /></Link></Button> : null}</header>
    {!paired ? <section className="mt-10 rounded-[1rem] bg-secondary p-6 sm:p-8"><h2 className="font-display text-3xl">Milestones begin with a connected partner.</h2><p className="mt-3 max-w-[60ch] leading-7 text-muted-foreground">Connect both accounts so each date stays inside one clear couple boundary.</p><Button asChild className="mt-6"><Link href="/pairing">Connect partner</Link></Button></section> : milestones.length === 0 ? <section className="mt-12"><Flag className="size-8 text-primary" /><h2 className="mt-5 font-display text-4xl">Which date first made this feel like us?</h2><p className="mt-4 max-w-[60ch] leading-7 text-muted-foreground">Start with one date. You can feature it on Home or simply keep it in your shared timeline.</p><Button asChild className="mt-7"><Link href="/milestones/new">Keep the first milestone</Link></Button></section> : <section className="relationship-thread mt-10 space-y-2" aria-label="Milestone timeline">{milestones.map((milestone) => <article id={milestone.id} key={milestone.id} className="relative flex gap-5 py-5"><span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-[0_6px_20px_-12px_rgba(80,20,40,.8)]"><CalendarHeart className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-3xl"><Link href={"/milestones/"+milestone.id} className="hover:underline">{milestone.title}</Link></h2>{milestone.is_featured ? <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"><Star className="size-3.5 fill-current" />Featured</span> : null}</div><p className="mt-2 text-sm font-semibold text-primary">{formatter.format(new Date(`${milestone.milestone_date}T00:00:00Z`))} · {milestone.type}</p>{milestone.description ? <p className="mt-3 max-w-[65ch] leading-7 text-muted-foreground">{milestone.description}</p> : null}<div className="max-w-lg"><EntryPreview access={{kind:"moment",id:milestone.id,previewSession}} entryTitle={milestone.title} entryDate={milestone.milestone_date}/></div></div></article>)}</section>}
  </div>;
}
