"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The month grid itself: weekday header, day chips, selection, and keyboard
 * traversal. What goes inside a day is the caller's business.
 *
 * Interior rules are drawn by a one-pixel grid gap over a `bg-border`
 * container, not by a border on every cell. Per-cell borders put the last
 * column's right edge and the last row's bottom edge on top of the wrapper's
 * own border, so those two edges rendered at two pixels and clipped raggedly
 * against the panel radius. It follows that every cell must carry an explicit
 * background, or the container colour bleeds through.
 *
 * Extracted so both of this app's calendars share one grid. The plans
 * workspace had no keyboard navigation at all; adopting this gives it arrow
 * keys and a roving tabindex for free.
 */
export function MonthGrid({ days, selected, today, anchorMonth, onSelect, dayLabel, renderDay }: {
  days: string[];
  selected: string;
  today: string;
  /** "YYYY-MM": days outside it are dimmed as trailing days of the view. */
  anchorMonth: string;
  onSelect: (day: string) => void;
  /** The full accessible name for a cell, count and contents included. */
  dayLabel: (day: string) => string;
  renderDay?: (day: string) => React.ReactNode;
}) {
  const grid = useRef<HTMLDivElement>(null);

  return <div className="mt-5 overflow-hidden rounded-panel border">
    <div className="grid grid-cols-7 border-b bg-secondary">
      {WEEKDAYS.map(d => <span key={d} className="py-3 text-center text-xs font-semibold">{d}</span>)}
    </div>

    <div ref={grid} className="grid grid-cols-7 gap-px bg-border">
      {days.map((day, i) => {
        const active = day === selected;
        return <button
          key={day}
          type="button"
          data-day={day}
          aria-label={dayLabel(day)}
          aria-pressed={active}
          aria-current={day === today ? "date" : undefined}
          tabIndex={active || (!days.includes(selected) && i === 0) ? 0 : -1}
          onClick={() => onSelect(day)}
          onKeyDown={e => {
            const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 7 : e.key === "ArrowUp" ? -7 : 0;
            if (!delta) return;
            e.preventDefault();
            const next = Math.max(0, Math.min(days.length - 1, i + delta));
            onSelect(days[next]);
            // Selected by data-day rather than by tag, so nothing a caller
            // renders inside a cell can shift the index.
            grid.current?.querySelectorAll<HTMLButtonElement>("button[data-day]")[next]?.focus();
          }}
          className={cn(
            "min-h-20 min-w-0 p-1.5 text-left sm:min-h-28 sm:p-3",
            "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
            active ? "bg-secondary ring-2 ring-inset ring-primary" : "bg-card hover:bg-secondary/50",
          )}
        >
          <span className={cn(
            "inline-grid size-7 place-items-center rounded-full text-sm",
            day === today ? "bg-primary text-primary-foreground"
              : day.slice(0, 7) !== anchorMonth ? "text-muted-foreground" : "",
          )}>
            {Number(day.slice(-2))}
          </span>
          {renderDay?.(day)}
        </button>;
      })}
    </div>
  </div>;
}
