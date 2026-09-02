"use client";

import { useActionState, useState } from "react";
import { CircleAlert } from "lucide-react";
import { createPlanAction } from "@/app/actions/dream";
import { initialActionState } from "@/lib/auth/types";
import { planTypes } from "@/lib/dream/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";

const fieldClass = "min-h-12 w-full rounded-lg border border-border bg-field px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";

export function PlanForm({ defaultTimezone }: { defaultTimezone: string }) {
  const [state, action] = useActionState(createPlanAction, initialActionState);
  const [timezone, setTimezone] = useState(defaultTimezone);
  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="space-y-2"><Label htmlFor="title">What are you planning?</Label><Input id="title" name="title" placeholder="A quiet dinner, a day trip…" required aria-invalid={Boolean(state.fields?.title)} />{state.fields?.title ? <p className="field-error">{state.fields.title[0]}</p> : null}</div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="type">Kind of plan</Label><select id="type" name="type" className={fieldClass} defaultValue="date">{planTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="location">Location <span className="font-normal text-muted-foreground">optional</span></Label><Input id="location" name="location" placeholder="Home, a café, somewhere new" /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="description">A few details <span className="font-normal text-muted-foreground">optional</span></Label><textarea id="description" name="description" rows={4} className={fieldClass} placeholder="Keep the idea, booking details, or what would make it special." /></div>
      <fieldset className="rounded-[1rem] bg-secondary p-5 sm:p-6"><legend className="px-1 font-display text-2xl">When</legend><div className="mt-2 grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="startsAt">Starts</Label><Input id="startsAt" name="startsAt" type="datetime-local" required aria-invalid={Boolean(state.fields?.startsAt)} />{state.fields?.startsAt ? <p className="field-error">{state.fields.startsAt[0]}</p> : null}</div><div className="space-y-2"><Label htmlFor="endsAt">Ends <span className="font-normal text-muted-foreground">optional</span></Label><Input id="endsAt" name="endsAt" type="datetime-local" aria-invalid={Boolean(state.fields?.endsAt)} />{state.fields?.endsAt ? <p className="field-error">{state.fields.endsAt[0]}</p> : null}</div></div><div className="mt-5 space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} required aria-invalid={Boolean(state.fields?.timezone)} /><Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}>Use my device timezone</Button></div></fieldset>
      <fieldset><legend className="font-display text-2xl">Budget <span className="font-sans text-sm text-muted-foreground">optional</span></legend><div className="mt-3 grid grid-cols-[1fr_8rem] gap-3"><div className="space-y-2"><Label htmlFor="budget">Amount</Label><Input id="budget" name="budget" inputMode="decimal" placeholder="0.00" aria-invalid={Boolean(state.fields?.budget)} /></div><div className="space-y-2"><Label htmlFor="currency">Currency</Label><Input id="currency" name="currency" maxLength={3} placeholder="USD" className="uppercase" aria-invalid={Boolean(state.fields?.currency)} /></div></div></fieldset>
      {state.message ? <div className="status-message status-error" role="alert"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{state.message}</div> : null}
      <SubmitButton>Save this plan</SubmitButton>
    </form>
  );
}
