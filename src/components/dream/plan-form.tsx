"use client";
import {LocationField} from "@/components/entries/location-field";

import { useActionState, useState, useEffect, startTransition } from "react";
import { CircleAlert } from "lucide-react";
import type { Plan } from "@/lib/plans/types";
import { localInput } from "@/lib/plans/calendar";
import { updatePlanAction } from "@/app/actions/plans";
import { createPlanAction } from "@/app/actions/dream";
import { initialActionState } from "@/lib/auth/types";
import { planTypes, zonedLocalToUtc } from "@/lib/dream/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";


const fieldClass = "min-h-12 w-full rounded-lg border border-border bg-field px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";

export function PlanForm({ defaultTimezone, plan }: { defaultTimezone: string; plan?: Plan }) {
  const [state, action, pending] = useActionState(async (previous: typeof initialActionState, data: FormData) => {
      try { return await (plan ? updatePlanAction : createPlanAction)(previous, data); }
      catch (error) {
        if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
        return { status: "error" as const, message: "Connection interrupted. Your entries are still here. Try again." };
      }
    }, initialActionState);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [resolved, setResolved] = useState("");
  useEffect(() => {
    const first = Object.keys(state.fields ?? {})[0];
    if (first) document.getElementById(first)?.focus();
  }, [state]);
  function previewTime(form: HTMLFormElement) {
    const data = new FormData(form);
    if (!data.get("startsAt")) { setResolved(""); return; }
    try {
      const instant = zonedLocalToUtc(String(data.get("startsAt")), String(data.get("timezone")), String(data.get("occurrence") || "reject") as "reject" | "earlier" | "later");
      const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setResolved(new Intl.DateTimeFormat("en", { timeZone: deviceZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(instant)) + " in " + deviceZone);
    } catch (error) { setResolved(error instanceof Error ? error.message : "Check the local time."); }
  }
  const fieldError = (name: string) => state.fields?.[name] ? <p id={name + "-error"} className="field-error">{state.fields[name][0]}</p> : null;
  const errorProps = (name: string) => ({ "aria-invalid": Boolean(state.fields?.[name]), "aria-describedby": state.fields?.[name] ? name + "-error" : undefined });
  return (
    <form action={action} onChange={event => previewTime(event.currentTarget)} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => action(data)); }} className="space-y-6" noValidate>
      {plan ? <><input type="hidden" name="planId" value={plan.id}/><input type="hidden" name="version" value={plan.version}/></> : null}
      <div className="space-y-2"><Label htmlFor="title">What are you planning?</Label><Input id="title" name="title" defaultValue={plan?.title} placeholder="A quiet dinner, a day trip…" required {...errorProps("title")} />{fieldError("title")}</div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="type">Kind of plan</Label><select id="type" name="type" {...errorProps("type")} className={fieldClass} defaultValue={plan?.type ?? "date"}>{planTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}</select>{fieldError("type")}</div>
        <div className="space-y-2"><LocationField defaultValue={plan?.location??""} invalid={!!state.fields?.location}/>{fieldError("location")}</div>
      </div>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary">Map link (optional)</summary>
        <div className="mt-3 space-y-4"><div className="space-y-2"><Label htmlFor="mapUrl">Map link</Label><Input id="mapUrl" name="mapUrl" type="url" defaultValue={plan?.external_map_url ?? ""} placeholder="https://" {...errorProps("mapUrl")}/>{fieldError("mapUrl")}</div>
</div>
      </details>
      <div className="space-y-2"><Label htmlFor="description">A few details <span className="font-normal text-muted-foreground">optional</span></Label><textarea id="description" name="description" {...errorProps("description")} defaultValue={plan?.description ?? ""} rows={4} className={fieldClass} placeholder="Keep the idea, booking details, or what would make it special." />{fieldError("description")}</div>
      <fieldset className="rounded-[1rem] bg-secondary p-5 sm:p-6"><legend className="px-1 font-display text-2xl">When</legend><div className="mt-2 grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="startsAt">Starts</Label><Input id="startsAt" name="startsAt" defaultValue={plan ? localInput(plan.starts_at, plan.originating_timezone) : ""} type="datetime-local" required {...errorProps("startsAt")} />{fieldError("startsAt")}</div><div className="space-y-2"><Label htmlFor="endsAt">Ends <span className="font-normal text-muted-foreground">optional</span></Label><Input id="endsAt" name="endsAt" defaultValue={plan?.ends_at ? localInput(plan.ends_at, plan.originating_timezone) : ""} type="datetime-local" {...errorProps("endsAt")} />{fieldError("endsAt")}</div></div><div className="mt-5 space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} required {...errorProps("timezone")} />{fieldError("timezone")}<Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}>Use my device timezone</Button></div></fieldset>
      <fieldset><legend className="font-display text-2xl">Budget <span className="font-sans text-sm text-muted-foreground">optional</span></legend><div className="mt-3 grid grid-cols-[1fr_8rem] gap-3"><div className="space-y-2"><Label htmlFor="budget">Amount</Label><Input id="budget" name="budget" defaultValue={plan?.budget_minor != null ? (plan.budget_minor/100).toFixed(2) : ""} inputMode="decimal" placeholder="0.00" {...errorProps("budget")} />{fieldError("budget")}</div><div className="space-y-2"><Label htmlFor="currency">Currency</Label><Input id="currency" name="currency" defaultValue={plan?.currency ?? ""} maxLength={3} placeholder="USD" className="uppercase" {...errorProps("currency")} />{fieldError("currency")}</div></div></fieldset>
      <div className="space-y-2"><Label htmlFor="occurrence">When clocks repeat an hour</Label><select id="occurrence" name="occurrence" {...errorProps("occurrence")} defaultValue="reject" className={fieldClass}><option value="reject">Ask me to choose</option><option value="earlier">Use the earlier occurrence</option><option value="later">Use the later occurrence</option></select>{fieldError("occurrence")}<p className="text-sm text-muted-foreground">Only applies when the same local time occurs twice during a clock change.</p></div>
      {resolved ? <p className="rounded-lg bg-secondary p-4 text-sm" role="status">{resolved}</p> : null}
      {state.message ? <div className="status-message status-error" role="alert"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{state.message}</div> : null}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Saving…" : plan ? "Save changes" : "Save this plan"}</Button>
    </form>
  );
}
