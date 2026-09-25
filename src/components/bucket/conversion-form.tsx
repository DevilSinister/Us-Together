"use client";
import Link from "next/link";
import { useActionState } from "react";
import { createMemoryAction } from "@/app/actions/dream";
import { initialActionState } from "@/lib/auth/types";
import type { BucketItem } from "@/lib/bucket/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bucketFieldClass } from "./bucket-workspace";

/**
 * Keeps a completed bucket idea as a memory. Turning an idea into a plan is no
 * longer here: the full plan form takes the idea as its source instead (see
 * PlanForm's `source`), so both routes into a plan share one form.
 */
export function BucketConversionForm({ item }: { item: BucketItem; mode?: "memory" }) {
  const [state, action, pending] = useActionState(createMemoryAction, initialActionState);
  return <div className="mx-auto max-w-2xl"><Link className="inline-flex min-h-11 items-center font-semibold text-primary" href={`/bucket/${item.id}`}>Back to the idea</Link><p className="mt-5 text-sm font-semibold text-primary">From a completed bucket idea</p><h1 className="mt-2 font-display text-4xl">Keep what mattered.</h1><p className="mt-4 leading-7 text-muted-foreground">Review the details below. The link to your idea stays with this memory.</p><form action={action} className="mt-8 space-y-5"><input type="hidden" name="sourceBucketId" value={item.id} /><label className="block space-y-2 font-semibold">Memory title<Input name="title" defaultValue={item.title} required maxLength={160} /></label><label className="block space-y-2 text-sm font-semibold">What do you want to remember?<textarea name="description" className={bucketFieldClass} rows={4} defaultValue={item.description ?? ""} maxLength={12000} /></label><label className="block space-y-2 text-sm font-semibold">Location<Input name="location" defaultValue={item.location ?? ""} maxLength={240} /></label>
      <input name="sourcePlanId" type="hidden" value="" /><label className="block space-y-2 text-sm font-semibold">Date<Input name="memoryDate" type="date" defaultValue={item.completed_at?.slice(0, 10)} required /></label><label className="block space-y-2 text-sm font-semibold">How it felt<select aria-label="How it felt" name="rating" className={bucketFieldClass}><option value="">No rating</option>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label><label className="flex min-h-11 items-center gap-3 text-sm"><input name="favorite" type="checkbox" className="size-5 accent-primary" />Keep as a favorite</label>
      <p role="status" className="min-h-6 text-sm text-danger">{state.message}</p>{state.fields ? <ul className="text-sm text-danger">{Object.entries(state.fields).map(([key, errors]) => <li key={key}>{key}: {errors[0]}</li>)}</ul> : null}<div className="flex flex-wrap gap-3"><Button disabled={pending}>{pending ? "Saving…" : "Save the memory"}</Button><Button asChild variant="ghost"><Link href={`/bucket/${item.id}`}>Cancel</Link></Button></div></form></div>;
}
