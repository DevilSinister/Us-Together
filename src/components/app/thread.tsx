import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A circular marker sitting over the relationship thread's gradient line.
 * `muted` drops the elevation for a step that is still an invitation rather
 * than something the couple has saved.
 */
export function ThreadMarker({ icon: Icon, muted = false }: { icon: LucideIcon; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary",
        muted ? null : "shadow-marker",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
