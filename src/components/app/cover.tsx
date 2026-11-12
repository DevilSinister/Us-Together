import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { CoverPhoto, type CoverImage, type PreviewEntry } from "@/components/app/cover-photo";
import { cn } from "@/lib/utils";

const heights = {
  tall: "h-[26rem] md:h-[22rem] lg:h-[24rem]",
  standard: "h-[19rem] md:h-[16rem] lg:h-[18rem]",
  detail: "h-[24rem] md:h-[20rem] lg:h-[22rem]",
  // A band is a cover with no photograph to show: only as tall as its title,
  // with room above it for the phone header that lies over every cover.
  band: "min-h-[13.25rem] pt-[5.5rem] md:min-h-0 md:pt-9",
} as const;

/** A band with a corner back button clears that button instead of the header, at every width. */
const bandWithBack = "min-h-[12rem] pt-[4.75rem] md:min-h-0";

/**
 * The top of a Cover screen (ADR-053): a photograph under a scrim, or the deep
 * cover field when there is none, with the screen's title laid over its foot.
 *
 * On a phone it bleeds to the screen edges. An index screen lets the phone
 * header lie transparently over it; a detail screen (`back`) carries its own
 * round back button in the corner instead and the header steps aside. A screen
 * that is itself all photographs (the gallery) asks for a `band`: the same
 * field with no photo, only as tall as its title. From tablet width a cover is
 * a rounded panel in the content column. Everything inside
 * reads the re-pointed cover tokens (`.on-cover`), so it is light in both themes.
 */
export function Cover({ photo = null, previewSession, previewEntry = null, height = "standard", labelledBy, back, action, menu, className, children }: {
  photo?: CoverImage | null;
  previewSession?: string;
  previewEntry?: PreviewEntry | null;
  height?: keyof typeof heights;
  labelledBy: string;
  /** Where the corner back button leads, and what it is called for a screen reader. */
  back?: { href: string; label: string };
  /** Shown beside the title from tablet width, where there is no floating button. */
  action?: React.ReactNode;
  /** The corner "More options" (an `EntryMenu`), opposite the back button: Edit, Delete and their kin. */
  menu?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-cover-page={back ? "detail" : "index"}
      aria-labelledby={labelledBy}
      className={cn(
        "on-cover relative -mx-5 -mt-8 flex flex-col justify-end overflow-hidden bg-cover-field px-5 pb-12 sm:-mx-8 sm:px-8 md:mx-0 md:mt-0 md:rounded-surface md:pb-9 lg:px-10",
        height === "band" ? (back ? bandWithBack : heights.band) : heights[back ? "detail" : height],
        className,
      )}
    >
      <CoverPhoto photo={photo} previewSession={previewSession} previewEntry={previewEntry} />
      {back ? (
        <Link
          href={back.href}
          aria-label={back.label}
          className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-[rgb(8_7_6/0.42)] text-[var(--cover-foreground)] transition-[background-color,transform] duration-200 hover:bg-[rgb(8_7_6/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none md:left-4 md:top-4"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </Link>
      ) : null}
      {menu ? <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] md:right-4 md:top-4">{menu}</div> : null}
      <div className="cover-rise relative flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        {action ? <div className="hidden shrink-0 md:block">{action}</div> : null}
      </div>
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

/** The CSS custom property that orders a row in a `.stagger` list. */
export function staggerIndex(index: number) {
  return { "--i": index } as React.CSSProperties;
}

/**
 * The phone's one create action, floating above the bottom navigation. Hidden
 * from tablet width, where the screen shows the same action inline instead, so
 * a floating button never sits on top of content there.
 */
export const floatingActionClass = "fab-in fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 grid size-14 place-items-center rounded-panel bg-primary text-primary-foreground shadow-[0_14px_30px_-14px_rgb(0_0_0/0.7)] transition-[background-color,scale] duration-200 hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none md:hidden";

export function FloatingAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className={floatingActionClass}>
      <Plus className="size-6" aria-hidden="true" />
    </Link>
  );
}
