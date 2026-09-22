"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Images, Flag } from "lucide-react";

import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { refreshWindow } from "@/lib/partner-sync";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { MonthGrid } from "./month-grid";
import { loadSharedCalendar } from "@/app/actions/calendar";
import { calendarDays, addDays, localDate } from "@/lib/plans/calendar";
import { entriesOnDay, visibleEntries, calendarKinds, type CalendarKind, type SharedCalendarPage } from "@/lib/entries/calendar";
import { cn } from "@/lib/utils";

const labels: Record<CalendarKind, string> = { plan: "Plan", memory: "Memory", moment: "Moment" };
const icons = { plan: CalendarDays, memory: Images, moment: Flag };
// Shape first, colour second: wine and rose are the same value in dark mode.
const markers: Record<CalendarKind, string> = {
  plan: "rounded-full bg-primary",
  memory: "rounded-none bg-rose",
  moment: "rotate-45 rounded-none bg-secondary-foreground",
};
const fullDate = (d: string) => new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

/**
 * Plans, memories and moments on one month.
 *
 * The decluttering here is mostly one idea: the legend is the filter. There
 * used to be four filter buttons wrapping onto two lines, and separately three
 * marker shapes in the grid with nothing anywhere to say what they meant. One
 * row of three toggle chips, each showing its own shape beside its name, is
 * both at once - and independent toggles rather than one exclusive choice,
 * because predictability beats cleverness on a control you use constantly.
 *
 * The per-day "N entries" line is gone. The markers already say what is there
 * and the cell's accessible name already carries the count, so it was a third
 * encoding of the same fact and the noisiest one.
 *
 * The three creation links moved down into the selected day's foot, where they
 * can act on the chosen date instead of competing with the page title.
 */
export function SharedCalendar({ initial }: { initial: SharedCalendarPage }) {
  const [page, setPage] = useState(initial);
  const [selected, setSelected] = useState(initial.date);
  const [active, setActive] = useState<ReadonlySet<CalendarKind>>(() => new Set(calendarKinds));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  usePartnerRefresh(async () => {
    const result = await refreshWindow<SharedCalendarPage["entries"][number], SharedCalendarPage["next"]>(async cursors => {
      const response = await loadSharedCalendar({ date: page.date, view: page.view, cursors: cursors ?? undefined });
      return { items: response.entries, next: Object.values(response.next).some(Boolean) ? response.next : null };
    }, page.entries.length);
    setPage(current => current === page ? { ...current, entries: result.items, next: result.next ?? { plan: null, memory: null, moment: null } } : current);
  }, pending);

  const days = calendarDays(page.view, page.date);
  const entries = visibleEntries(page.entries, active);
  const onDay = entriesOnDay(entries, selected);
  const today = localDate(new Date(), page.timezone);

  function load(date: string, view = page.view, more = false) {
    start(async () => {
      try {
        const next = await loadSharedCalendar({ date, view, cursors: more ? page.next : undefined });
        setPage(more ? { ...next, entries: [...page.entries, ...next.entries] } : next);
        if (!more) setSelected(date);
        setError("");
      } catch {
        setError("Could not load these dates. Your current calendar is still here. Try again.");
      }
    });
  }

  function move(delta: number) {
    if (page.view === "week") return load(addDays(page.date, delta * 7));
    const d = new Date(page.date.slice(0, 7) + "-01T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + delta);
    load(d.toISOString().slice(0, 10));
  }

  function toggle(kind: CalendarKind) {
    setActive(current => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  }

  function dayName(day: string) {
    const matches = entriesOnDay(entries, day);
    if (!matches.length) return fullDate(day) + ", nothing saved";
    const kinds = calendarKinds.filter(k => matches.some(x => x.kind === k)).map(k => labels[k]).join(", ");
    return fullDate(day) + ", " + matches.length + " " + (matches.length === 1 ? "entry" : "entries") + ": " + kinds;
  }

  return <section className="mt-8" aria-label="Shared calendar" aria-busy={pending}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={pending} aria-label="Previous period" onClick={() => move(-1)}><ChevronLeft className="size-4"/></Button>
        <h2 className="min-w-0 font-display text-2xl sm:text-3xl">
          {new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(page.date + "T12:00:00Z"))}
        </h2>
        <Button variant="outline" disabled={pending} aria-label="Next period" onClick={() => move(1)}><ChevronRight className="size-4"/></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => load(today)}>Today</Button>
        {(["month", "week"] as const).map(v =>
          <Button key={v} variant={page.view === v ? "default" : "outline"} aria-pressed={page.view === v} disabled={pending} onClick={() => load(selected, v)}>
            {v === "month" ? "Month" : "Week"}
          </Button>)}
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Show on the calendar">
      {calendarKinds.map(k => {
        const on = active.has(k);
        return <button
          key={k}
          type="button"
          aria-pressed={on}
          onClick={() => toggle(k)}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-navigation px-3 text-sm font-semibold",
            "transition-colors duration-200 motion-reduce:transition-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            on ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50",
          )}
        >
          <span aria-hidden="true" className={cn("size-2 shrink-0", markers[k], !on && "opacity-30")}/>
          {labels[k]}s
        </button>;
      })}
    </div>

    {error ? <p role="alert" className="status-message status-error mt-4">{error}</p> : null}

    {!active.size ? <p className="mt-5 flex flex-wrap items-center gap-x-3 rounded-panel bg-secondary px-5 py-4 text-sm">
      Nothing is showing on the calendar.
      <Button variant="ghost" size="sm" onClick={() => setActive(new Set(calendarKinds))}>Show everything</Button>
    </p> : null}

    <MonthGrid
      days={days}
      selected={selected}
      today={today}
      anchorMonth={page.date.slice(0, 7)}
      onSelect={setSelected}
      dayLabel={dayName}
      renderDay={day => {
        const matches = entriesOnDay(entries, day);
        if (!matches.length) return null;
        return <span className="mt-1 flex flex-wrap gap-1" aria-hidden="true">
          {calendarKinds.map(k => matches.some(x => x.kind === k)
            ? <span key={k} title={labels[k]} className={cn("size-2", markers[k])}/>
            : null)}
        </span>;
      }}
    />

    {Object.values(page.next).some(Boolean)
      ? <Button className="mt-4" variant="outline" disabled={pending} onClick={() => load(page.date, page.view, true)}>Load more calendar entries</Button>
      : null}

    <div className="mt-8" aria-live="polite">
      <h3 className="font-display text-3xl">{fullDate(selected)}</h3>
      {/* True and worth keeping, but it explains this agenda rather than being
          a precondition for looking at the month. */}
      <p className="mt-1 text-xs text-muted-foreground">Plan times use {page.timezone}. Memories and moments stay on their saved date.</p>

      {onDay.length ? <ul className="mt-4 divide-y border-y">
        {onDay.map(e => {
          const Icon = icons[e.kind];
          return <li key={e.kind + e.id}>
            <Link href={e.href} className="flex min-h-20 items-center gap-4 py-4 hover:text-primary">
              <Icon className="size-5 shrink-0 text-primary" aria-hidden="true"/>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground">{labels[e.kind]}{e.status ? " · " + e.status : ""}</span>
                <span className="mt-1 block break-words text-lg font-semibold">{e.title}</span>
              </span>
            </Link>
          </li>;
        })}
      </ul> : <p className="mt-4 text-muted-foreground">
        Nothing saved for this date{active.size < calendarKinds.length ? " in what you are showing" : ""}. Choose another day or add something to remember.
      </p>}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t pt-4">
        <InlineLink href={"/memories/new?date=" + selected}>Keep a memory from this day</InlineLink>
        <InlineLink href={"/milestones/new?date=" + selected}>Mark a moment</InlineLink>
        <InlineLink href="/plans">Manage plans</InlineLink>
      </div>
    </div>
  </section>;
}
