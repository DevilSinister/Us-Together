import { cn } from "@/lib/utils";

/**
 * The single page-level heading for signed-in surfaces.
 *
 * Both layouts share the page-title role; `compact` narrows the reading measure.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  back,
  scale = "display",
  rule = true,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
  scale?: "display" | "compact";
  rule?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between", rule ? "border-b" : null, className)}>
      <div className="min-w-0">
        {back ? <div className="mb-2 flex flex-wrap items-center gap-5">{back}</div> : null}
        {eyebrow ? <p className="text-sm font-semibold text-primary">{eyebrow}</p> : null}
        <h1
          className={cn(
            "mt-2 text-balance font-display text-page-title",
            scale === "display" ? "max-w-4xl" : "max-w-3xl",
          )}
        >
          {title}
        </h1>
        {lede ? <p className="mt-2 max-w-[65ch] text-base leading-6 text-muted-foreground">{lede}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
