import { HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl text-primary", className)}>
      <span className="grid size-9 place-items-center rounded-full border border-current/20 bg-primary/7" aria-hidden="true">
        <HeartHandshake className="size-5" strokeWidth={1.7} />
      </span>
      <span>Us Together</span>
    </span>
  );
}
