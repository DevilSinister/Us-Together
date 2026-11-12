import Link from "next/link";
import { BookOpen, CalendarDays, ListChecks, LockKeyhole, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const loop: Array<{ icon: LucideIcon; kicker: string; title: string }> = [
  { icon: ListChecks, kicker: "Dream", title: "Keep a list of things you want to do" },
  { icon: CalendarDays, kicker: "Plan", title: "Turn one into a date on the calendar" },
  { icon: Sparkles, kicker: "Memory", title: "Keep the day, with photos and notes" },
  { icon: BookOpen, kicker: "Our Story", title: "Read it back, chapter by chapter" },
];

/**
 * The front door, in the Cover language (ADR-053): a tall cover with the
 * wordmark and Sign in at its head and the promise at its foot, then the
 * product loop as four quiet rows, one way in, and the privacy line. The cover
 * field carries the same rose light as the signed-out screens, since there is
 * no photograph to show a stranger. From desktop width the cover is a
 * full-height panel beside the rest.
 */
export default function LandingPage() {
  return (
    <main id="main" className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
      <section aria-labelledby="landing-title" className="on-cover relative isolate flex h-[30rem] flex-col justify-between overflow-hidden bg-cover-field px-5 pb-12 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:p-12">
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(110%_70%_at_90%_0%,color-mix(in_oklch,var(--rose)_38%,transparent),transparent_62%),radial-gradient(90%_60%_at_0%_100%,color-mix(in_oklch,var(--rose)_18%,transparent),transparent_70%)]" />
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[1.1875rem] text-[var(--cover-foreground)]">Us Together</span>
          <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-control border border-[var(--cover-foreground)] px-3.5 text-sm font-semibold text-[var(--cover-foreground)] transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">Sign in</Link>
        </div>
        <div className="cover-rise max-w-2xl">
          <h1 id="landing-title" className="text-balance font-display text-5xl leading-[1.02] tracking-[-0.02em] lg:text-7xl">Our own private little world.</h1>
          <p className="mt-2.5 text-[0.9375rem] leading-6 text-muted-foreground lg:text-lg">A shared journal for the two of you.</p>
        </div>
      </section>

      <div className="reveal-on-load relative -mt-6 rounded-t-surface bg-background px-5 pb-10 pt-6 sm:px-8 lg:mt-0 lg:flex lg:items-center lg:rounded-none lg:px-12">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          <p className="text-base leading-[1.7] text-foreground/90">Plan what&rsquo;s next, keep what mattered, and watch it turn into your story.</p>
          <ul className="flex flex-col">
            {loop.map(({ icon: Icon, kicker, title }) => (
              <li key={kicker} className="flex min-h-[4.25rem] items-center gap-3 border-b border-border py-3 last:border-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><Icon className="size-5" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                  <span className="text-[1.0625rem] font-semibold leading-[1.35]">{title}</span>
                  <span className="text-[0.8125rem] leading-5 text-muted-foreground">{kicker}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="w-full"><Link href="/sign-up">Create your space</Link></Button>
          <p className="flex gap-2.5 text-[0.8125rem] leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Private to the two of you. What you mark as yours alone stays that way.</span>
          </p>
        </div>
      </div>
    </main>
  );
}
