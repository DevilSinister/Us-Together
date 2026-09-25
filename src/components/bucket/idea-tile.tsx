import Link from "next/link";
import {
  CalendarDays, CircleCheck, Clapperboard, Coffee, Flag, Gamepad2, Heart, MapPin, Mountain,
  Music, Palette, Plane, Sofa, Sparkles, Tag, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import { categoryMark, priorityLevel, type BucketGrouping, type CategoryMark } from "@/lib/bucket/grouping";
import type { BucketItem } from "@/lib/bucket/schema";
import { cn } from "@/lib/utils";

export const categoryIcons: Record<CategoryMark, LucideIcon> = {
  travel: Plane, food: UtensilsCrossed, ritual: Coffee, outdoors: Mountain, home: Sofa,
  culture: Palette, milestone: Flag, romance: Heart, film: Clapperboard, music: Music,
  games: Gamepad2, other: Tag,
};

const statusText: Record<string, string> = { idea: "Idea", planned: "Planned", in_progress: "In progress", completed: "Completed" };
const priorityText: Record<string, string> = { low: "Low", medium: "Medium", high: "High", dream: "Dream" };
const shortDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

/**
 * One idea, as a tile you can read at arm's length: what kind of thing it is
 * (its category mark), how much you want it (a four-mark meter, the same
 * vocabulary as a memory's rating), and where and when - and, once lived, the
 * day you lived it. Whatever the list is grouped by is left off the tile, since
 * the section heading already says it.
 */
export function IdeaTile({ item, groupedBy }: { item: BucketItem; groupedBy: BucketGrouping }) {
  const Icon = categoryIcons[categoryMark(item.category)];
  const done = item.status === "completed";
  const level = priorityLevel(item.priority);
  const lived = done && item.completed_at ? shortDate.format(new Date(item.completed_at)) : null;

  return (
    <Link
      href={`/bucket/${item.id}`}
      className={cn(
        "group flex h-full min-w-0 flex-col rounded-panel border p-4 transition-colors duration-200 hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none sm:p-5",
        done ? "border-transparent bg-muted" : "bg-card hover:bg-secondary/30",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {/* A lived idea trades its category mark for a check: done reads first. */}
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", done ? "bg-success/15 text-success" : "bg-secondary text-primary")}>
            {done ? <CircleCheck className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
          </span>
          {groupedBy !== "category" ? (
            <span className="truncate text-xs font-semibold text-secondary-foreground">{item.category || "No category"}</span>
          ) : null}
        </span>

        {groupedBy !== "priority" ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((mark) => (
                <span key={mark} className={cn("size-1.5 rounded-full", mark <= level ? "bg-rose" : "bg-border")} />
              ))}
            </span>
            {item.priority === "dream" ? <Sparkles className="size-3.5 text-rose" aria-hidden="true" /> : null}
            {priorityText[item.priority] ?? item.priority}<span className="sr-only"> priority</span>
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 line-clamp-2 break-words font-display text-2xl leading-tight transition-colors group-hover:text-primary motion-reduce:transition-none">
        {item.title}
      </h3>
      {item.description ? <p className="mt-1.5 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">{item.description}</p> : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-xs text-muted-foreground empty:hidden">
        {groupedBy !== "status" && !done ? (
          <span className="rounded-control bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">{statusText[item.status] ?? item.status}</span>
        ) : null}
        {lived ? <span className="font-semibold text-success">Lived {lived}</span> : done && groupedBy !== "status" ? <span className="font-semibold text-success">Completed</span> : null}
        {!done && item.target_date ? (
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />By {shortDate.format(new Date(`${item.target_date}T12:00:00Z`))}</span>
        ) : null}
        {item.location ? (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{item.location}</span></span>
        ) : null}
      </div>
    </Link>
  );
}
