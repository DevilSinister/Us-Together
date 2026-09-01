import Link from "next/link";
import { ArrowRight, CalendarDays, LockKeyhole, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden px-5 py-5 sm:px-8 sm:py-8">
      <section className="paper-surface mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[92rem] flex-col overflow-hidden rounded-[1.25rem] border bg-card sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between border-b px-5 py-4 sm:px-8">
          <BrandMark />
          <Button asChild variant="ghost" size="sm"><Link href="/sign-in">Sign in <ArrowRight className="size-4" /></Link></Button>
        </header>
        <div className="grid flex-1 lg:grid-cols-[1.18fr_.82fr]">
          <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16 xl:px-24">
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="size-4" />Your private little world</p>
            <h1 className="max-w-3xl text-balance font-display text-5xl leading-[.98] tracking-[-0.03em] sm:text-6xl lg:text-[5.4rem]">The plans ahead. The memories behind them. All yours.</h1>
            <p className="mt-7 max-w-[66ch] text-lg leading-8 text-muted-foreground">Us Together connects the things you dream about with the moments you plan and the memories you keep—without turning your relationship into a dashboard.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/sign-up">Create your space <ArrowRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="/sign-in">Welcome back</Link></Button>
            </div>
          </div>
          <div className="relative flex min-h-[32rem] items-center bg-secondary/70 px-6 py-12 sm:px-12 lg:min-h-0">
            <div className="relationship-thread mx-auto w-full max-w-lg space-y-1 reveal-on-load">
              {[
                [CalendarDays, "Plan", "Turn a wish into something on the calendar."],
                [Sparkles, "Experience", "Keep the details close while you’re out living them."],
                [LockKeyhole, "Remember", "Carry the story home when memory-making arrives."],
              ].map(([Icon, label, copy]) => (
                <div key={String(label)} className="relative flex gap-5 py-6">
                  <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-[0_6px_20px_-12px_rgba(80,20,40,.8)]"><Icon className="size-4" /></span>
                  <div><p className="font-display text-2xl text-foreground">{String(label)}</p><p className="mt-1 leading-6 text-muted-foreground">{String(copy)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
