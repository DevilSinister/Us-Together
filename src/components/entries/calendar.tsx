"use client";
import { useState, useTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Images, Plus } from "lucide-react";

import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { refreshWindow } from "@/lib/partner-sync";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet } from "@/components/app/cover";
import { MonthGrid } from "./month-grid";
import { loadSharedCalendar } from "@/app/actions/calendar";
import { calendarDays } from "@/lib/plans/calendar";
import { plain } from "@/lib/plans/list";
import {
  entriesOnDay, visibleEntries, calendarKinds, monthCounts, monthLine, openingDay, shiftMonth,
  type CalendarEntry, type CalendarKind, type SharedCalendarPage,
} from "@/lib/entries/calendar";
import { cn } from "@/lib/utils";

const labels: Record<CalendarKind, string> = { plan: "Plan", memory: "Memory", moment: "Moment" };
const plurals: Record<CalendarKind, string> = { plan: "Plans", memory: "Memories", moment: "Moments" };
const icons = { plan: CalendarDays, memory: Images, moment: Flag };
// Shape first, colour second: wine and rose are the same value in dark mode.
const markers: Record<CalendarKind, string> = {
  plan: "rounded-full bg-primary",
  memory: "rounded-none bg-rose",
  moment: "rotate-45 rounded-none bg-secondary-foreground",
};
const statusWords: Record<string, string> = { completed: "Completed", cancelled: "Cancelled" };

const at = (day: string) => new Date(day + "T12:00:00Z");
const fullDate = (d: string) => new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" }).format(at(d));
const dayTitle = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(at(d)).replace(",", "");
const monthTitle = (m: string, withYear = false) => new Intl.DateTimeFormat("en", { month: "long", year: withYear ? "numeric" : undefined, timeZone: "UTC" }).format(at(m + "-01"));
const daysBetween = (from: string, to: string) => Math.round((at(to).getTime() - at(from).getTime()) / 86_400_000);

/**
 * The shared calendar as a Cover screen (ADR-053): the month is the band's
 * title, with what it holds beneath and the arrows beside it. Each month has
 * its own address (`?month=2026-12`), so the arrows are links, the back button
 * steps back through months, and a reload stays where you were.
 *
 * The legend is the filter: three toggle chips, each with its own marker
 * shape, independent rather than one exclusive choice. Under the grid the
 * chosen day lists what is on it, each row saying when and where, and one
 * "Add to this day" opens the three things you can add, with the day filled in.
 */
export function SharedCalendar({ initial, today }: { initial: SharedCalendarPage; today: string }) {
  const month = initial.date.slice(0, 7);
  const [page, setPage] = useState(initial);
  const [selected, setSelected] = useState(() => openingDay(initial.entries, month, today));
  const [active, setActive] = useState<ReadonlySet<CalendarKind>>(() => new Set(calendarKinds));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  usePartnerRefresh(async () => {
    const result = await refreshWindow<CalendarEntry, SharedCalendarPage["next"]>(async cursors => {
      const response = await loadSharedCalendar({ date: page.date, view: page.view, cursors: cursors ?? undefined });
      return { items: response.entries, next: Object.values(response.next).some(Boolean) ? response.next : null };
    }, page.entries.length);
    setPage(current => current === page ? { ...current, entries: result.items, next: result.next ?? { plan: null, memory: null, moment: null } } : current);
  }, pending);

  // A month that fits in five weeks drops the sixth row: it would hold only next month's days.
  const grid = calendarDays("month", page.date);
  const days = grid.slice(35).some(day => day.startsWith(month)) ? grid : grid.slice(0, 35);
  const entries = visibleEntries(page.entries, active);
  const onDay = entriesOnDay(entries, selected);
  const counts = monthCounts(page.entries, month);

  function loadMore() {
    start(async () => {
      try {
        const next = await loadSharedCalendar({ date: page.date, view: page.view, cursors: page.next });
        setPage({ ...next, entries: [...page.entries, ...next.entries] });
        setError("");
      } catch {
        setError("Could not load the rest of this month. What is here is still here. Try again.");
      }
    });
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

  function kicker(entry: CalendarEntry) {
    const parts: (string | null | undefined)[] = [labels[entry.kind]];
    if (entry.status && statusWords[entry.status]) parts.push(statusWords[entry.status]);
    if (entry.kind === "plan") {
      if (entry.endDay > entry.day) parts.push(`Day ${daysBetween(entry.day, selected) + 1} of ${daysBetween(entry.day, entry.endDay) + 1}`);
      if (entry.startsAt && selected === entry.day) parts.push(plain(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: page.timezone }).format(new Date(entry.startsAt))));
    }
    parts.push(entry.location);
    return parts.filter(Boolean).join(" · ");
  }

  const previous = shiftMonth(month, -1), next = shiftMonth(month, 1);
  const thisMonth = today.slice(0, 7);

  return <>
    <Cover labelledBy="calendar-title" height="band">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 id="calendar-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">{monthTitle(month)}</h1>
          <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">{month.slice(0, 4)} · {monthLine(counts)}</p>
        </div>
        <nav aria-label="Months" className="-mr-3 flex shrink-0 items-center">
          {month !== thisMonth ? <Link
            href="/calendar"
            className="mr-1 grid min-h-11 place-items-center rounded-control px-3 text-sm font-semibold transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >Today</Link> : null}
          <MonthLink month={previous} label={"Previous month, " + monthTitle(previous, true)}><ChevronLeft className="size-5" /></MonthLink>
          <MonthLink month={next} label={"Next month, " + monthTitle(next, true)}><ChevronRight className="size-5" /></MonthLink>
        </nav>
      </div>
    </Cover>

    <CoverSheet>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12" aria-busy={pending}>
        <div className="flex w-full max-w-[28rem] flex-col gap-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show on the calendar">
            {calendarKinds.map(k => {
              const on = active.has(k);
              return <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(k)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-control px-2.5 text-[0.8125rem] font-semibold",
                  "transition-colors duration-150 motion-reduce:transition-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  on ? "bg-secondary text-foreground" : "text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:text-foreground",
                )}
              >
                <span aria-hidden="true" className={cn("size-1.5 shrink-0", markers[k], !on && "opacity-30")} />
                {plurals[k]}
              </button>;
            })}
          </div>

          {error ? <p role="alert" className="status-message status-error">{error}</p> : null}

          {!active.size ? <p className="flex flex-wrap items-center gap-x-3 rounded-panel bg-secondary px-4 py-3 text-sm">
            Nothing is showing on the calendar.
            <Button variant="ghost" size="sm" onClick={() => setActive(new Set(calendarKinds))}>Show everything</Button>
          </p> : null}

          <MonthGrid
            label={monthTitle(month, true)}
            days={days}
            selected={selected}
            today={today}
            anchorMonth={month}
            onSelect={setSelected}
            dayLabel={dayName}
            renderDay={day => {
              const matches = entriesOnDay(entries, day);
              if (!matches.length) return null;
              return <span className="flex gap-[3px]" aria-hidden="true">
                {calendarKinds.map(k => matches.some(x => x.kind === k)
                  ? <span key={k} className={cn("size-1.5", markers[k], day === selected && "bg-primary-foreground")} />
                  : null)}
              </span>;
            }}
          />

          {Object.values(page.next).some(Boolean)
            ? <Button className="self-start" variant="outline" disabled={pending} onClick={loadMore}>Load the rest of this month</Button>
            : null}
        </div>

        <section aria-labelledby="day-title" className="flex min-w-0 flex-col gap-2.5 lg:max-w-xl">
          <h2 id="day-title" aria-live="polite" className="font-display text-[1.375rem] leading-[1.3]">{dayTitle(selected)}</h2>

          {onDay.length ? <ul className="flex flex-col">
            {onDay.map(e => {
              const Icon = icons[e.kind];
              return <li key={e.kind + e.id} className="border-b border-border last:border-0">
                <Link href={e.href} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                    <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{e.title}</span>
                    <span className="text-[0.8125rem] leading-5 text-muted-foreground">{kicker(e)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>;
            })}
          </ul> : <p className="py-2 text-[0.9375rem] leading-6 text-muted-foreground">
            Nothing on this day{active.size < calendarKinds.length ? " in what you are showing" : ""}.
          </p>}

          <AddToDay key={selected} day={selected} upcoming={selected >= today} />

          {onDay.some(e => e.kind === "plan") ? <p className="text-xs leading-5 text-muted-foreground">Plan times are shown in {page.timezone}.</p> : null}
        </section>
      </div>
    </CoverSheet>
  </>;
}

function MonthLink({ month, label, children }: { month: string; label: string; children: React.ReactNode }) {
  return <Link
    href={"/calendar?month=" + month}
    aria-label={label}
    scroll={false}
    className="grid size-11 place-items-center rounded-control transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
  >
    <Pending>{children}</Pending>
  </Link>;
}

/** The arrow dims while its month is on the way, so a slow network still answers the tap. */
function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={cn("grid transition-opacity duration-150 motion-reduce:transition-none", pending && "opacity-40")}>{children}</span>;
}

/**
 * One way in, three things to add, each opening with the day already filled
 * in. A day still to come offers a plan first; a day gone by, what you kept.
 */
function AddToDay({ day, upcoming }: { day: string; upcoming: boolean }) {
  const [open, setOpen] = useState(false);
  const options = [
    { kind: "plan" as const, label: "A plan", href: "/plans/new?date=" + day },
    { kind: "memory" as const, label: "A memory", href: "/memories/new?date=" + day },
    { kind: "moment" as const, label: "A moment", href: "/milestones/new?date=" + day },
  ];
  const ordered = upcoming ? [options[0], options[2], options[1]] : [options[1], options[2], options[0]];
  return <div className="mt-1.5">
    <button
      type="button"
      aria-expanded={open}
      aria-controls="add-to-day"
      onClick={() => setOpen(value => !value)}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border px-3.5 text-sm font-semibold transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
    >
      <Plus className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-45")} aria-hidden="true" />
      {open ? "Close" : "Add to this day"}
    </button>
    {open ? <ul id="add-to-day" className="mt-2 grid grid-cols-3 gap-2">
      {ordered.map(option => {
        const Icon = icons[option.kind];
        return <li key={option.kind}>
          <Link href={option.href} className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-control bg-secondary px-2 text-[0.8125rem] font-semibold transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
            <Icon className="size-5" aria-hidden="true" />
            {option.label}
          </Link>
        </li>;
      })}
    </ul> : null}
  </div>;
}
