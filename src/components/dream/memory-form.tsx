"use client";

import { useActionState } from "react";
import { CircleAlert, LockKeyhole } from "lucide-react";
import { createMemoryAction } from "@/app/actions/dream";
import { initialActionState } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

const fieldClass = "min-h-12 w-full rounded-lg border border-border bg-field px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";

export function MemoryForm({ sourcePlan }: { sourcePlan?: { id: string; title: string; memoryDate: string; location: string | null } }) {
  const [state, action] = useActionState(createMemoryAction, initialActionState);
  const suggestedDate = sourcePlan?.memoryDate ?? new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="sourcePlanId" value={sourcePlan?.id ?? ""} />
      {sourcePlan ? <div className="rounded-[1rem] bg-secondary p-5"><p className="text-sm font-semibold text-primary">From a completed plan</p><p className="mt-2 font-display text-2xl">{sourcePlan.title}</p><p className="mt-2 text-sm text-muted-foreground">The link stays with this memory, even as you edit its story.</p></div> : null}
      <div className="space-y-2"><Label htmlFor="title">Memory title</Label><Input id="title" name="title" defaultValue={sourcePlan?.title} placeholder="The name you’ll want to find later" required aria-invalid={Boolean(state.fields?.title)} />{state.fields?.title ? <p className="field-error">{state.fields.title[0]}</p> : null}</div>
      <div className="space-y-2"><Label htmlFor="description">What do you want to remember?</Label><textarea id="description" name="description" rows={6} className={fieldClass} placeholder="The tiny detail, the feeling, the thing that made you laugh…" /></div>
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="memoryDate">Date</Label><Input id="memoryDate" name="memoryDate" type="date" defaultValue={suggestedDate} required aria-invalid={Boolean(state.fields?.memoryDate)} /></div><div className="space-y-2"><Label htmlFor="location">Location <span className="font-normal text-muted-foreground">optional</span></Label><Input id="location" name="location" defaultValue={sourcePlan?.location ?? ""} /></div></div>
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="rating">How it felt <span className="font-normal text-muted-foreground">optional</span></Label><select id="rating" name="rating" className={fieldClass} defaultValue=""><option value="">No rating</option>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></div><label className="flex min-h-12 items-center gap-3 self-end rounded-lg border bg-field px-4 text-sm font-semibold"><input type="checkbox" name="favorite" className="size-5 accent-[var(--primary)]" />Keep as a favorite</label></div>
      <div className="flex gap-3 rounded-[1rem] border p-4 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><p>This memory is shared only with your active partner. Media uploads use a private bucket; the first release of this form saves the story before media is attached.</p></div>
      {state.message ? <div className="status-message status-error" role="alert"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{state.message}</div> : null}
      <SubmitButton>Save the memory</SubmitButton>
    </form>
  );
}
