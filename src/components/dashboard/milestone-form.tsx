"use client";

import { useActionState } from "react";
import { CircleAlert, Star } from "lucide-react";
import { createMilestoneAction } from "@/app/actions/dashboard";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/auth/types";
import { milestoneTypes } from "@/lib/dashboard/schema";

const fieldClass = "min-h-12 w-full rounded-lg border border-border bg-field px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";

export function MilestoneForm() {
  const [state, action] = useActionState(createMilestoneAction, initialActionState);
  return <form action={action} className="space-y-6" noValidate>
    <div className="space-y-2"><Label htmlFor="title">Milestone name</Label><Input id="title" name="title" placeholder="The day we chose us" required aria-invalid={Boolean(state.fields?.title)} />{state.fields?.title ? <p className="field-error">{state.fields.title[0]}</p> : null}</div>
    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="type">Kind of milestone</Label><select id="type" name="type" className={fieldClass} defaultValue="custom">{milestoneTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div><div className="space-y-2"><Label htmlFor="milestoneDate">Date</Label><Input id="milestoneDate" name="milestoneDate" type="date" required aria-invalid={Boolean(state.fields?.milestoneDate)} />{state.fields?.milestoneDate ? <p className="field-error">{state.fields.milestoneDate[0]}</p> : null}</div></div>
    <div className="space-y-2"><Label htmlFor="description">What makes it yours? <span className="font-normal text-muted-foreground">optional</span></Label><textarea id="description" name="description" rows={5} className={fieldClass} placeholder="Keep the detail you both want to remember." /></div>
    <label className="flex min-h-12 items-center gap-3 rounded-[1rem] bg-secondary px-5 py-4 text-sm font-semibold"><input type="checkbox" name="featured" className="size-5 accent-[var(--primary)]" /><Star className="size-4 text-primary" aria-hidden="true" />Feature this milestone on Home</label>
    {state.message ? <div className="status-message status-error" role="alert"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{state.message}</div> : null}
    <SubmitButton>Save milestone</SubmitButton>
  </form>;
}
