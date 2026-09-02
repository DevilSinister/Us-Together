import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarHeart, Heart, Images, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Memories" };

type MemoryRow = { id: string; title: string; description: string | null; memory_date: string; location: string | null; rating: number | null; is_favorite: boolean; source_plan_id: string | null; source_bucket_item_id: string | null };

export default async function MemoriesPage() {
  const identity = await getCurrentIdentity();
  let paired = false;
  let memories: MemoryRow[] = [];
  let planNames = new Map<string, string>();
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    paired = state.coupleStatus === "paired";
    memories = state.memories.map((memory) => ({ id: memory.id, title: memory.title, description: memory.description || null, memory_date: memory.memoryDate, location: memory.location || null, rating: memory.rating, is_favorite: memory.favorite, source_plan_id: memory.sourcePlanId, source_bucket_item_id: memory.sourceBucketId ?? null }));
    planNames = new Map(state.plans.map((plan) => [plan.id, plan.title]));
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data: membership } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle();
    paired = Boolean(membership);
    if (membership) {
      const [{ data: rows }, { data: plans }] = await Promise.all([
        supabase.from("memories").select("id,title,description,memory_date,location,rating,is_favorite,source_plan_id,source_bucket_item_id").eq("couple_id", membership.couple_id).order("memory_date", { ascending: false }).order("id", { ascending: false }).limit(36),
        supabase.from("plans").select("id,title").eq("couple_id", membership.couple_id).limit(50),
      ]);
      memories = (rows ?? []) as MemoryRow[];
      planNames = new Map((plans ?? []).map((plan) => [plan.id, plan.title]));
    }
  }
  const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

  return <div className="reveal-on-load"><header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">The life you’re keeping</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Memories with their thread intact.</h1><p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted-foreground">Keep the story, the place, and the plan that led here—without turning what mattered into a filing system.</p></div>{paired ? <Button asChild><Link href="/memories/new">Add a memory <ArrowRight className="size-4" /></Link></Button> : null}</header>
    {!paired ? <section className="mt-10 rounded-[1rem] bg-secondary p-6 sm:p-8"><h2 className="font-display text-3xl">Memories live inside your shared space.</h2><p className="mt-3 max-w-[60ch] leading-7 text-muted-foreground">Connect your partner first so the gallery is protected by an active couple membership.</p><Button asChild className="mt-6"><Link href="/pairing">Connect partner</Link></Button></section> : memories.length === 0 ? <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_20rem]"><div><Images className="size-8 text-primary" /><h2 className="mt-5 font-display text-4xl">Start with the detail you never want to lose.</h2><p className="mt-4 max-w-[60ch] leading-7 text-muted-foreground">A memory does not need to be a milestone. Write down the ordinary moment that already feels like yours.</p><Button asChild className="mt-7"><Link href="/memories/new">Keep the first memory</Link></Button></div><aside className="rounded-[1rem] bg-secondary p-6"><CalendarHeart className="size-6 text-primary" /><h3 className="mt-4 font-display text-2xl">Plans can come home here.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Complete a plan, then save it as a memory without losing where the story began.</p><Link href="/plans" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">View plans</Link></aside></section> : <section className="mt-10" aria-label="Memory gallery"><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{memories.map((memory) => <article id={memory.id} key={memory.id} className="group flex min-h-64 flex-col rounded-[1rem] border bg-card p-6"><div className="flex items-start justify-between gap-4"><p className="text-sm text-muted-foreground">{dateFormatter.format(new Date(`${memory.memory_date}T00:00:00Z`))}</p>{memory.is_favorite ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Heart className="size-4 fill-current" />Favorite</span> : null}</div><h2 className="mt-4 font-display text-3xl">{memory.title}</h2>{memory.description ? <p className="mt-3 line-clamp-4 leading-7 text-muted-foreground">{memory.description}</p> : <p className="mt-3 text-sm italic text-muted-foreground">The title is enough for now.</p>}<div className="mt-auto pt-6">{memory.location ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{memory.location}</p> : null}{memory.rating ? <p className="mt-2 text-sm font-semibold text-primary">{memory.rating} / 5</p> : null}{memory.source_bucket_item_id ? <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href={`/bucket/${memory.source_bucket_item_id}`}>From your bucket list</Link> : null}{memory.source_plan_id && planNames.get(memory.source_plan_id) ? <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">From the plan “{planNames.get(memory.source_plan_id)}”</p> : null}</div></article>)}</div><p className="mt-6 text-sm text-muted-foreground">Showing up to 36 newest memories. The gallery uses bounded date-and-ID ordering.</p></section>}
  </div>;
}
