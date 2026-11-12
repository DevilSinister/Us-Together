"use client";
import { LocationField } from "@/components/entries/location-field";

import { useActionState, useState, useEffect, useSyncExternalStore, startTransition } from "react";
import { CircleAlert } from "lucide-react";
import type { Plan } from "@/lib/plans/types";
import { localInput } from "@/lib/plans/calendar";
import { reminderLabel, reminderWhen } from "@/lib/plans/list";
import { updatePlanAction } from "@/app/actions/plans";
import { createPlanAction } from "@/app/actions/dream";
import { initialActionState } from "@/lib/auth/types";
import { planTypeLabel, planTypes, zonedLocalToUtc } from "@/lib/dream/schema";
import type { BucketItem } from "@/lib/bucket/schema";
import { suggestedPlanType } from "@/lib/bucket/grouping";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fieldClass = "w-full rounded-control border border-border bg-field px-4 py-3 text-base leading-7 text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";
const reminderOptions = [1440, 60, 0, 10080, 15];
/** Fields that live under "More details": an error in any of them opens it. */
const moreFields = ["type", "endsAt", "budget", "currency", "mapUrl", "timezone", "occurrence"];
const noSubscription = () => () => {};

/**
 * Creates or edits a plan in the Cover form pattern: what, the day and the
 * time side by side, the place, notes, and (when creating) a first reminder,
 * then one full-width Save. The rest of what a plan can hold - its kind, an
 * end, a budget, a map link, the timezone and the clock-change rule - waits
 * under "More details", which opens by itself when any of it is filled or
 * needs fixing.
 *
 * Given a `source` bucket idea, it opens already filled from that idea and the
 * saved plan stays linked to it. The day and time are two fields joined into
 * the one local `startsAt` the server action expects.
 */
export function PlanForm({ defaultTimezone, plan, source, defaultDate }: {
  defaultTimezone: string;
  plan?: Plan;
  source?: BucketItem;
  /** "YYYY-MM-DD" from the calendar: the day is filled in and the time left to choose. */
  defaultDate?: string;
}) {
  const [state, action, pending] = useActionState(async (previous: typeof initialActionState, data: FormData) => {
    try { return await (plan ? updatePlanAction : createPlanAction)(previous, data); }
    catch (error) {
      if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
      return { status: "error" as const, message: "Connection interrupted. Your entries are still here. Try again." };
    }
  }, initialActionState);

  const initialStart = plan ? localInput(plan.starts_at, plan.originating_timezone) : "";
  const [date, setDate] = useState(initialStart.slice(0, 10) || source?.target_date || defaultDate || "");
  const [time, setTime] = useState(initialStart.slice(11, 16));
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [reminder, setReminder] = useState(plan ? "" : "1440");
  // The device zone is read only in the browser, and the clock only when the day, time or reminder
  // changes, so the first paint always matches the server.
  const deviceZone = useSyncExternalStore(noSubscription, () => Intl.DateTimeFormat().resolvedOptions().timeZone || null, () => null);
  const [now, setNow] = useState<number | null>(null);
  const startsAt = date && time ? `${date}T${time}` : "";
  const filledMore = Boolean(plan?.ends_at || plan?.budget_minor != null || plan?.external_map_url || source?.estimated_cost_minor != null || (plan && plan.type !== "date"));
  const errorInMore = moreFields.some((name) => state.fields?.[name]);

  useEffect(() => {
    const first = Object.keys(state.fields ?? {})[0];
    if (first) document.getElementById(first === "startsAt" ? (date ? "startTime" : "startDate") : first)?.focus();
    // Focus follows a new result only, not the date the person is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // When the plan and its reminder fall in the timezone it is planned in; null until the day and time are chosen.
  let instant: string | null = null;
  try { instant = startsAt ? zonedLocalToUtc(startsAt, timezone, "earlier") : null; } catch { instant = null; }
  const due = instant && reminder !== "" ? new Date(Date.parse(instant) - Number(reminder) * 60_000) : null;
  const elsewhere = instant && deviceZone && deviceZone !== timezone
    ? new Intl.DateTimeFormat("en", { timeZone: deviceZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(instant)).replace(/[   ]/g, " ") + " where you are (" + deviceZone + ")"
    : null;

  const fieldError = (name: string) => state.fields?.[name] ? <p id={name + "-error"} className="field-error">{state.fields[name][0]}</p> : null;
  const errorProps = (name: string) => ({ "aria-invalid": Boolean(state.fields?.[name]), "aria-describedby": state.fields?.[name] ? name + "-error" : undefined });

  return (
    <form action={action} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => action(data)); }} className="flex flex-col gap-4" noValidate>
      {plan ? <><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="version" value={plan.version} /></> : null}
      {source ? <input type="hidden" name="sourceBucketId" value={source.id} /> : null}
      <input type="hidden" name="startsAt" value={startsAt} />

      <div className="space-y-1.5">
        <Label htmlFor="title">What are you planning?</Label>
        <Input id="title" name="title" defaultValue={plan?.title ?? source?.title} placeholder="A quiet dinner, a day trip…" maxLength={160} required {...errorProps("title")} />
        {fieldError("title")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Date</Label>
          <Input id="startDate" type="date" value={date} onChange={(event) => { setDate(event.target.value); setNow(Date.now()); }} required aria-invalid={Boolean(state.fields?.startsAt && !date)} aria-describedby={state.fields?.startsAt ? "startsAt-error" : undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Time</Label>
          <Input id="startTime" type="time" value={time} onChange={(event) => { setTime(event.target.value); setNow(Date.now()); }} required aria-invalid={Boolean(state.fields?.startsAt && !time)} aria-describedby={state.fields?.startsAt ? "startsAt-error" : undefined} />
        </div>
        {state.fields?.startsAt ? <p id="startsAt-error" className="field-error col-span-2">{state.fields.startsAt[0]}</p> : null}
      </div>

      <div className="space-y-1.5">
        <LocationField label="Place" hint="Suggestions come from OpenStreetMap. Any name you type is fine." defaultValue={plan?.location ?? source?.location ?? ""} invalid={!!state.fields?.location} />
        {fieldError("location")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Notes <span className="font-normal text-muted-foreground">optional</span></Label>
        <textarea id="description" name="description" {...errorProps("description")} defaultValue={plan?.description ?? source?.description ?? ""} rows={4} maxLength={8000} className={fieldClass} placeholder="Anything worth remembering before the day" />
        {fieldError("description")}
      </div>

      {plan ? null : (
        <div className="space-y-1.5">
          <Label htmlFor="reminder">Remind us</Label>
          <select id="reminder" name="reminder" value={reminder} onChange={(event) => { setReminder(event.target.value); setNow(Date.now()); }} className={fieldClass}>
            {reminderOptions.map((minutes) => <option key={minutes} value={String(minutes)}>{reminderLabel(minutes)}</option>)}
            <option value="">No reminder</option>
          </select>
          <p className="text-[0.8125rem] leading-5 text-muted-foreground" aria-live="polite">
            {due && now !== null ? (due.getTime() > now ? "Arrives " + reminderWhen(due.toISOString(), timezone, new Date(now)) + "." : "That time has already passed, so no reminder will be set.") : "Choose the day and time to see when it arrives."}
          </p>
        </div>
      )}

      <details open={filledMore || errorInMore || undefined} className="group rounded-panel bg-secondary px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          More details
          <span className="text-[0.8125rem] font-normal text-muted-foreground group-open:hidden">Kind, end, budget, map, timezone</span>
        </summary>
        <div className="flex flex-col gap-4 pb-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="type">Kind of plan</Label>
            <select id="type" name="type" {...errorProps("type")} className={fieldClass} defaultValue={plan?.type ?? (source ? suggestedPlanType(source.category) : "date")}>
              {planTypes.map((type) => <option key={type} value={type}>{planTypeLabel(type)}</option>)}
            </select>
            {fieldError("type")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endsAt">Ends <span className="font-normal text-muted-foreground">optional</span></Label>
            <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={plan?.ends_at ? localInput(plan.ends_at, plan.originating_timezone) : ""} {...errorProps("endsAt")} />
            {fieldError("endsAt")}
          </div>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold">Budget <span className="font-normal text-muted-foreground">optional</span></legend>
            <div className="mt-1.5 grid grid-cols-[1fr_6.5rem] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget" className="sr-only">Amount</Label>
                <Input id="budget" name="budget" defaultValue={plan?.budget_minor != null ? (plan.budget_minor / 100).toFixed(2) : source?.estimated_cost_minor != null ? (source.estimated_cost_minor / 100).toFixed(2) : ""} inputMode="decimal" placeholder="0.00" {...errorProps("budget")} />
                {fieldError("budget")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency" className="sr-only">Currency</Label>
                <Input id="currency" name="currency" defaultValue={plan?.currency ?? source?.currency ?? ""} maxLength={3} placeholder="PKR" className="uppercase" {...errorProps("currency")} />
                {fieldError("currency")}
              </div>
            </div>
          </fieldset>
          {/* A plan made from an idea is saved through create_plan_from_bucket, which
              stores no map link; offering the field there would drop it silently. */}
          {source ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="mapUrl">Map link <span className="font-normal text-muted-foreground">optional</span></Label>
              <Input id="mapUrl" name="mapUrl" type="url" defaultValue={plan?.external_map_url ?? ""} placeholder="https://" {...errorProps("mapUrl")} />
              {fieldError("mapUrl")}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} required {...errorProps("timezone")} />
            {fieldError("timezone")}
            {deviceZone && deviceZone !== timezone ? (
              <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setTimezone(deviceZone)}>Use {deviceZone}, where you are</Button>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="occurrence">When clocks repeat an hour</Label>
            <select id="occurrence" name="occurrence" {...errorProps("occurrence")} defaultValue="reject" className={fieldClass}>
              <option value="reject">Ask me to choose</option>
              <option value="earlier">Use the earlier occurrence</option>
              <option value="later">Use the later occurrence</option>
            </select>
            {fieldError("occurrence")}
            <p className="text-[0.8125rem] leading-5 text-muted-foreground">Only matters when the same local time happens twice at a clock change.</p>
          </div>
        </div>
      </details>

      {elsewhere ? <p className="text-[0.8125rem] leading-5 text-muted-foreground" role="status">That is {elsewhere}.</p> : null}
      {state.message ? <div className="status-message status-error" role="alert"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{state.message}</div> : null}
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={pending}>{pending ? "Saving…" : plan ? "Save changes" : "Save plan"}</Button>
    </form>
  );
}
