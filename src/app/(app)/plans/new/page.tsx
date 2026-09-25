import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PlanForm } from "@/components/dream/plan-form";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadBucketItem, loadBucketLists, loadPlannableIdeas, type PlannableIdea } from "@/lib/bucket/data";
import type { BucketList } from "@/lib/bucket/schema";

export const metadata: Metadata = { title: "New plan" };

const pickerField = "min-h-12 w-full min-w-0 rounded-control border border-border bg-field px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ bucket?: string }> }) {
  const identity = await getCurrentIdentity();
  let timezone = "UTC";
  if (identity?.kind === "developer") timezone = (await readDeveloperState()).timezone;
  if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("profiles").select("timezone").eq("user_id", identity.userId).maybeSingle();
    timezone = data?.timezone ?? "UTC";
  }

  const { bucket } = await searchParams;
  const source = bucket ? await loadBucketItem(bucket) : null;
  if (bucket && !source) notFound();

  // The picker is a convenience: without a shared space, or if the ideas fail
  // to load, the page is still an ordinary new plan.
  let ideas: PlannableIdea[] = [];
  let lists: BucketList[] = [];
  try { [ideas, lists] = await Promise.all([loadPlannableIdeas(), loadBucketLists()]); } catch { /* no picker */ }
  const sourceList = source ? lists.find((list) => list.id === source.item.list_id) : null;

  return <div className="mx-auto max-w-3xl reveal-on-load">
    <Link href={source ? `/bucket/${source.item.id}` : "/plans"} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" />{source ? "Back to the idea" : "Back to plans"}</Link>
    <header className="mt-5">
      <p className="text-sm font-semibold text-primary">{source ? "From your bucket list" : "Something to look forward to"}</p>
      <h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">{source ? "Give someday a date." : "Make room for the moment."}</h1>
      <p className="mt-4 max-w-[65ch] text-lg leading-8 text-muted-foreground">{source ? "Everything your idea already knew is filled in. Add the time, and it stays linked to the idea." : "Start with the time and intention. The checklist, reminder, and memory can grow from here."}</p>
    </header>

    {ideas.length || source ? <section aria-labelledby="from-bucket" className="mt-8 rounded-panel bg-secondary p-5 sm:p-6">
      <h2 id="from-bucket" className="flex items-center gap-2 font-display text-2xl">
        <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {source ? <span className="min-w-0 break-words">Planning “{source.item.title}”</span> : "Plan something from your bucket list"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-secondary-foreground">
        {source
          ? (sourceList ? `From ${sourceList.title}. ` : "") + "Choose another idea, or start from scratch."
          : "Pick an idea and its details fill in below: title, story, place, target date and cost."}
      </p>
      {/* A plain GET form: choosing an idea reloads this page with it as the source, with or without JavaScript. */}
      {ideas.length ? <form action="/plans/new" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Bucket list idea</span>
          <select name="bucket" required defaultValue={source?.item.id ?? ""} className={pickerField}>
            <option value="" disabled>Choose an idea…</option>
            {lists.filter((list) => ideas.some((idea) => idea.list_id === list.id)).map((list) => (
              <optgroup key={list.id} label={list.title}>
                {ideas.filter((idea) => idea.list_id === list.id).map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" className="shrink-0">{source ? "Use this idea instead" : "Use this idea"}</Button>
      </form> : null}
      {source ? <Link href="/plans/new" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Start from scratch</Link> : null}
    </section> : null}

    <section className="mt-6 rounded-panel bg-card p-6 sm:p-8">
      {/* Keyed by the source, so choosing another idea refills every field. */}
      <PlanForm key={source?.item.id ?? "blank"} defaultTimezone={timezone} source={source?.item} />
    </section>
  </div>;
}
