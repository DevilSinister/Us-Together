"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The month grid of the shared calendar (ADR-053): weekday letters, then
 * 46px days with whatever the caller renders under the number. No rules
 * between days; trailing days are faded, today has a thin rose ring and the
 * chosen day is filled. It owns selection and keyboard traversal: arrow keys
 * move a roving tabindex across the days.
 */
export function MonthGrid({ days, selected, today, anchorMonth, onSelect, dayLabel, renderDay, label }: {
  days: string[];
  selected: string;
  today: string;
  /** "YYYY-MM": days outside it are dimmed as trailing days of the view. */
  anchorMonth: string;
  onSelect: (day: string) => void;
  /** The full accessible name for a cell, count and contents included. */
  dayLabel: (day: string) => string;
  renderDay?: (day: string) => React.ReactNode;
  /** What the grid shows, for a screen reader: "November 2026". */
  label?: string;
}) {
  const grid = useRef<HTMLDivElement>(null);

  return <div role="group" aria-label={label}>
    <div className="grid grid-cols-7" aria-hidden="true">
      {WEEKDAYS.map(d => <span key={d} className="h-7 pt-1 text-center text-xs font-semibold text-muted-foreground">{d[0]}</span>)}
    </div>
    <div ref={grid} className="grid grid-cols-7 gap-y-0.5">
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
            "flex h-[2.875rem] min-w-0 flex-col items-center gap-1 rounded-control pt-[9px] text-[0.9375rem] leading-[1.2] tabular-nums",
            "transition-colors duration-150 motion-reduce:transition-none",
            "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            active ? "bg-primary font-bold text-primary-foreground"
              : cn("hover:bg-secondary", day === today && "shadow-[inset_0_0_0_1px_var(--rose)]", day.slice(0, 7) !== anchorMonth && "text-muted-foreground/55"),
          )}
        >
          {Number(day.slice(-2))}
          {renderDay?.(day)}
        </button>;
      })}
    </div>
  </div>;
}
