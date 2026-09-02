import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MemoryForm } from "@/components/dream/memory-form";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadBucketItem } from "@/lib/bucket/data";
import { BucketConversionForm } from "@/components/bucket/conversion-form";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "New memory" };

function dateInTimezone(instant: string, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default async function NewMemoryPage({ searchParams }: { searchParams: Promise<{ plan?: string; bucket?: string }> }) {
  const { plan: planId, bucket } = await searchParams;
  if (bucket) { const source = await loadBucketItem(bucket); if (!source || source.item.status !== "completed") notFound(); return <BucketConversionForm item={source.item} mode="memory" />; }
  const identity = await getCurrentIdentity();
  let sourcePlan: { id: string; title: string; memoryDate: string; location: string | null } | undefined;
  if (planId && identity?.kind === "developer") {
    const state = await readDeveloperState();
    const plan = state.plans.find((candidate) => candidate.id === planId && candidate.status === "completed");
    if (plan) sourcePlan = { id: plan.id, title: plan.title, memoryDate: dateInTimezone(plan.startsAt, state.timezone), location: plan.location || null };
  }
  if (planId && identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data }, { data: profile }] = await Promise.all([
      supabase.from("plans").select("id,title,starts_at,location").eq("id", planId).eq("status", "completed").maybeSingle(),
      supabase.from("profiles").select("timezone").eq("user_id", identity.userId).maybeSingle(),
    ]);
    if (data) sourcePlan = { id: data.id, title: data.title, memoryDate: dateInTimezone(data.starts_at, profile?.timezone ?? "UTC"), location: data.location };
  }
  return <div className="mx-auto max-w-3xl reveal-on-load"><Link href="/memories" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" />Back to memories</Link><header className="mt-5"><p className="text-sm font-semibold text-primary">Keep what mattered</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Bring the moment home.</h1><p className="mt-4 max-w-[65ch] text-lg leading-8 text-muted-foreground">Keep the story, photos, and videos that bring it back.</p></header><section className="mt-9 rounded-[1rem] bg-card p-6 sm:p-8"><MemoryForm sourcePlan={sourcePlan} previewSession={identity?.kind==="developer"?(await readDeveloperState()).bucketSessionId:undefined} /></section></div>;
}
