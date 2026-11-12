import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Cover, CoverSheet } from "@/components/app/cover";
import { cn } from "@/lib/utils";
import { PlanForm } from "@/components/dream/plan-form";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadBucketItem, loadBucketLists, loadPlannableIdeas, type PlannableIdea } from "@/lib/bucket/data";
import type { BucketList } from "@/lib/bucket/schema";

export const metadata: Metadata = { title: "New plan" };

const pickerField = "min-h-11 w-full min-w-0 rounded-control border border-border bg-field px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ bucket?: string; date?: string }> }) {
  const identity = await getCurrentIdentity();
  let timezone = "UTC";
  if (identity?.kind === "developer") timezone = (await readDeveloperState()).timezone;
  if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("profiles").select("timezone").eq("user_id", identity.userId).maybeSingle();
    timezone = data?.timezone ?? "UTC";
  }

  const { bucket, date } = await searchParams;
  // The calendar links here with the day you had selected; anything else is ignored.
  const defaultDate = z.iso.date().safeParse(date).success ? date : undefined;
  const source = bucket ? await loadBucketItem(bucket) : null;
  if (bucket && !source) notFound();

  // The picker is a convenience: without a shared space, or if the ideas fail
  // to load, the page is still an ordinary new plan.
  let ideas: PlannableIdea[] = [];
  let lists: BucketList[] = [];
  try { [ideas, lists] = await Promise.all([loadPlannableIdeas(), loadBucketLists()]); } catch { /* no picker */ }
  const sourceList = source ? lists.find((list) => list.id === source.item.list_id) : null;

  return <>
    <Cover labelledBy="plan-form-title" height="band" back={source ? { href: `/bucket/${source.item.id}`, label: "Back to the idea" } : { href: "/plans", label: "Back to plans" }}>
      {source ? <p className="text-[0.8125rem] font-semibold text-primary">From your bucket list</p> : null}
      <h1 id="plan-form-title" className={cn("font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]", source && "mt-1.5")}>New plan</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">{source ? "What your idea already knew is filled in. Add the day and time." : "Something to look forward to."}</p>
    </Cover>

    <CoverSheet className="max-w-2xl">
      <div className="flex flex-col gap-6">
        {ideas.length || source ? <section aria-labelledby="from-bucket" className="flex flex-col gap-2 rounded-panel bg-secondary p-4">
          <h2 id="from-bucket" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {source ? <span className="min-w-0 break-words">Planning “{source.item.title}”{sourceList ? <span className="font-normal text-muted-foreground"> · {sourceList.title}</span> : null}</span> : "Start from a bucket list idea"}
          </h2>
          {/* A plain GET form: choosing an idea reloads this page with it as the source, with or without JavaScript. */}
          {ideas.length ? <form action="/plans/new" method="get" className="flex gap-2">
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
            <Button type="submit" variant="outline" className="shrink-0">{source ? "Use instead" : "Use it"}</Button>
          </form> : null}
          {source ? <Link href="/plans/new" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">Start from scratch</Link> : null}
        </section> : null}

        {/* Keyed by the source, so choosing another idea refills every field. */}
        <PlanForm key={source?.item.id ?? "blank"} defaultTimezone={timezone} source={source?.item} defaultDate={defaultDate} />
      </div>
    </CoverSheet>
  </>;
}
