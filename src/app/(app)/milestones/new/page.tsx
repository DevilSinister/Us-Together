import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { MilestoneForm } from "@/components/dashboard/milestone-form";

export const metadata: Metadata = { title: "New milestone" };

export default async function NewMilestonePage() {
  const identity=await getCurrentIdentity();
  return <div className="mx-auto max-w-3xl reveal-on-load"><Link href="/milestones" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" />Back to milestones</Link><header className="mt-5 border-b pb-8"><p className="text-sm font-semibold text-primary">Mark the timeline</p><h1 className="mt-2 text-balance font-display text-5xl tracking-[-0.03em] sm:text-6xl">Keep a date that changed your story.</h1><p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted-foreground">Milestones are shared with your active partner. Feature one when it belongs in the relationship thread on Home.</p></header><section className="mt-9"><MilestoneForm previewSession={identity?.kind==="developer"?(await readDeveloperState()).bucketSessionId:undefined}/></section><aside className="mt-8 flex gap-3 rounded-[1rem] border p-4 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" /><p>Notifications use a generic “milestone added” message. The private title and description are read only after the recipient passes couple membership checks.</p></aside></div>;
}
