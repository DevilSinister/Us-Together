"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The month grid itself: weekday header, day chips, selection, and keyboard
 * traversal. What goes inside a day is the caller's business.
 *
 * Two looks share one behaviour. `panel` is the bordered grid with room inside
 * each day, used where a day carries words. `cover` is the Cover calendar
 * (ADR-053): no rules, a 46px day with its markers under the number, today as
 * a thin ring and the chosen day filled.
 *
 * In `panel`, interior rules are drawn by a one-pixel grid gap over a
 * `bg-border` container, not by a border on every cell. Per-cell borders put
 * the last column's right edge and the last row's bottom edge on top of the
 * wrapper's own border, so those two edges rendered at two pixels and clipped
 * raggedly against the panel radius. It follows that every cell must carry an
 * explicit background, or the container colour bleeds through.
 */
export function MonthGrid({ days, selected, today, anchorMonth, onSelect, dayLabel, renderDay, variant = "panel", label }: {
  days: string[];
  selected: string;
  today: string;
  /** "YYYY-MM": days outside it are dimmed as trailing days of the view. */
  anchorMonth: string;
  onSelect: (day: string) => void;
  /** The full accessible name for a cell, count and contents included. */
  dayLabel: (day: string) => string;
  renderDay?: (day: string) => React.ReactNode;
  variant?: "panel" | "cover";
  /** What the grid shows, for a screen reader: "November 2026". */
  label?: string;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const cover = variant === "cover";

  const cells = days.map((day, i) => {
    const active = day === selected;
    const outside = day.slice(0, 7) !== anchorMonth;
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
      className={cover ? cn(
        "flex h-[2.875rem] min-w-0 flex-col items-center gap-1 rounded-control pt-[9px] text-[0.9375rem] leading-[1.2] tabular-nums",
        "transition-colors duration-150 motion-reduce:transition-none",
        "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "bg-primary font-bold text-primary-foreground"
          : cn("hover:bg-secondary", day === today && "shadow-[inset_0_0_0_1px_var(--rose)]", outside && "text-muted-foreground/55"),
      ) : cn(
        "min-h-20 min-w-0 p-1.5 text-left sm:min-h-28 sm:p-3",
        "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
        active ? "bg-secondary ring-2 ring-inset ring-primary" : "bg-card hover:bg-secondary/50",
      )}
    >
      {cover ? Number(day.slice(-2)) : <span className={cn(
        "inline-grid size-7 place-items-center rounded-full text-sm",
        day === today ? "bg-primary text-primary-foreground" : outside ? "text-muted-foreground" : "",
      )}>
        {Number(day.slice(-2))}
      </span>}
      {renderDay?.(day)}
    </button>;
  });

  if (cover) return <div role="group" aria-label={label}>
    <div className="grid grid-cols-7" aria-hidden="true">
      {WEEKDAYS.map(d => <span key={d} className="h-7 pt-1 text-center text-xs font-semibold text-muted-foreground">{d[0]}</span>)}
    </div>
    <div ref={grid} className="grid grid-cols-7 gap-y-0.5">{cells}</div>
  </div>;

  return <div role="group" aria-label={label} className="mt-5 overflow-hidden rounded-panel border">
    <div className="grid grid-cols-7 border-b bg-secondary">
      {WEEKDAYS.map(d => <span key={d} className="py-3 text-center text-xs font-semibold">{d.slice(0, 3)}</span>)}
    </div>
    <div ref={grid} className="grid grid-cols-7 gap-px bg-border">{cells}</div>
  </div>;
}
