import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanForm } from "@/components/dream/plan-form";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadBucketItem } from "@/lib/bucket/data";
import { BucketConversionForm } from "@/components/bucket/conversion-form";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "New plan" };

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
  if (bucket) { const source = await loadBucketItem(bucket); if (!source) notFound(); return <BucketConversionForm item={source.item} mode="plan" timezone={timezone} />; }
  return <div className="mx-auto max-w-3xl reveal-on-load"><Link href="/plans" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" />Back to plans</Link><header className="mt-5"><p className="text-sm font-semibold text-primary">Something to look forward to</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Make room for the moment.</h1><p className="mt-4 max-w-[65ch] text-lg leading-8 text-muted-foreground">Start with the time and intention. The checklist, reminder, and memory can grow from here.</p></header><section className="mt-9 rounded-[1rem] bg-card p-6 sm:p-8"><PlanForm defaultTimezone={timezone} /></section></div>;
}
