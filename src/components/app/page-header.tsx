import { cn } from "@/lib/utils";

/**
 * The single page-level heading for signed-in surfaces.
 *
 * `display` is the page-index scale documented in DESIGN.md; `compact` is for
 * workspaces and narrow reading columns where the display scale would crowd.
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
    <header className={cn("flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between", rule ? "border-b" : null, className)}>
      <div className="min-w-0">
        {back ? <div className="mb-2 flex flex-wrap items-center gap-5">{back}</div> : null}
        {eyebrow ? <p className="text-sm font-semibold text-primary">{eyebrow}</p> : null}
        <h1
          className={cn(
            "mt-2 max-w-4xl text-balance break-words font-display tracking-[-0.03em]",
            scale === "display" ? "text-5xl leading-[1.02] sm:text-6xl" : "text-4xl sm:text-5xl",
          )}
        >
          {title}
        </h1>
        {lede ? <p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted-foreground">{lede}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
