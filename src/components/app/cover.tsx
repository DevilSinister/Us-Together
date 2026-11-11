import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { CoverPhoto, type CoverImage, type PreviewEntry } from "@/components/app/cover-photo";
import { cn } from "@/lib/utils";

const heights = {
  tall: "h-[26rem] md:h-[22rem] lg:h-[24rem]",
  standard: "h-[19rem] md:h-[16rem] lg:h-[18rem]",
} as const;

/**
 * The top of a Cover screen (ADR-053): a photograph under a scrim, or the deep
 * cover field when there is none, with the screen's title laid over its foot.
 *
 * On a phone it bleeds to the screen edges and under the phone header, which
 * turns transparent because this section carries `data-cover-page`; from tablet
 * width it is a rounded panel in the content column. Everything inside reads the
 * re-pointed cover tokens (`.on-cover`), so type and links are light on it in
 * both themes.
 */
export function Cover({ photo = null, previewSession, previewEntry = null, height = "standard", labelledBy, className, children }: {
  photo?: CoverImage | null;
  previewSession?: string;
  previewEntry?: PreviewEntry | null;
  height?: keyof typeof heights;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-cover-page
      aria-labelledby={labelledBy}
      className={cn(
        "on-cover relative -mx-5 -mt-8 flex flex-col justify-end overflow-hidden bg-cover-field px-5 pb-12 sm:-mx-8 sm:px-8 md:mx-0 md:mt-0 md:rounded-surface md:pb-9 lg:px-10",
        heights[height],
        className,
      )}
    >
      <CoverPhoto photo={photo} previewSession={previewSession} previewEntry={previewEntry} />
      <div className="relative">{children}</div>
    </section>
  );
}

/**
 * The sheet that holds a Cover screen's content. On a phone it overlaps the
 * cover's foot with a rounded top; from tablet width it simply follows it.
 * The entrance animation lives here and never on a wrapper around the cover:
 * its leftover clip-path and transform would clip the cover's bleed and trap
 * any fixed button inside.
 */
export function CoverSheet({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("reveal-on-load relative -mx-5 -mt-6 rounded-t-surface bg-background px-5 pb-24 pt-5 sm:-mx-8 sm:px-8 md:mx-0 md:mt-8 md:rounded-none md:px-0 md:pb-16 md:pt-0", className)}>
      {children}
    </div>
  );
}

/** The way back, laid on the cover above its title. */
export function CoverBack({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <ArrowLeft className="size-4" aria-hidden="true" />{children}
    </Link>
  );
}

/**
 * The phone's one create action, floating above the bottom navigation. Hidden
 * from tablet width, where the screen shows the same action inline instead, so
 * a floating button never sits on top of content there.
 */
export const floatingActionClass = "fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 grid size-14 place-items-center rounded-panel bg-primary text-primary-foreground shadow-[0_14px_30px_-14px_rgb(0_0_0/0.7)] transition-[background-color,transform] duration-200 hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px motion-reduce:transition-none md:hidden";

export function FloatingAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className={floatingActionClass}>
      <Plus className="size-6" aria-hidden="true" />
    </Link>
  );
}
