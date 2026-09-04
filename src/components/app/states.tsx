import Link from "next/link";
import { HeartHandshake, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown when a surface needs a connected couple boundary before it has
 * anything to display. Every feature uses this one panel so an unpaired
 * partner meets the same explanation everywhere.
 */
export function PairingNotice({ title, body, cta = "Connect partner", className }: {
  title: string;
  body?: string;
  cta?: string;
  className?: string;
}) {
  return (
    <section className={cn("mt-10 rounded-panel bg-secondary p-6 sm:p-8", className)}>
      <HeartHandshake className="size-7 text-primary" aria-hidden="true" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">{title}</h2>
      {body ? <p className="mt-3 max-w-[60ch] leading-7 text-muted-foreground">{body}</p> : null}
      <Button asChild className="mt-6">
        <Link href="/pairing">{cta}</Link>
      </Button>
    </section>
  );
}

/**
 * A paired couple with nothing saved yet. Content-led rather than a bounded
 * card, so the invitation to start reads as part of the page.
 */
export function EmptyState({ icon: Icon, title, body, action, className }: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-12", className)}>
      {Icon ? <Icon className="size-8 text-primary" aria-hidden="true" /> : null}
      <h2 className={cn("font-display text-3xl sm:text-4xl", Icon ? "mt-5" : null)}>{title}</h2>
      {body ? <p className="mt-4 max-w-[60ch] leading-7 text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-7 flex flex-wrap items-center gap-3">{action}</div> : null}
    </section>
  );
}
