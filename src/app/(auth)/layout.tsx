import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen p-4 sm:p-7">
      {/*
        THESIS: Relationship continuity is the home structure; refuse the generic equal-card dashboard.
        OWN-WORLD: Warm paper and blush fields, deep-wine actions, charcoal type, fine rules, restrained rose.
        STORY: Sign in to a private shared space, then move from what is next to what you dream and remember.
        FIRST VIEWPORT: A calm split with the form primary and the relationship thread visible beside it.
        FORM: concept-c/relationship-thread-calm-auth; narrative-left and form-right on wide screens.
      */}
      <section className="paper-surface mx-auto grid min-h-[calc(100vh-2rem)] max-w-[90rem] overflow-hidden rounded-[1.25rem] border lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[.86fr_1.14fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
          <BrandMark className="text-primary-foreground" />
          <div className="relative z-10 max-w-lg">
            <p className="font-display text-6xl leading-[1.35] tracking-[-0.03em] xl:text-7xl">A quiet place for everything you’re building together.</p>
            <p className="mt-7 max-w-md text-lg leading-8 text-primary-foreground/78">Private by design, warm by nature, and ready when the next little moment becomes a memory.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-sm text-primary-foreground/75"><LockKeyhole className="size-4" />Your account is separate. Sharing starts only when you connect a partner.</div>
          <div className="pointer-events-none absolute -bottom-40 -right-32 z-0 size-[34rem] rounded-full border border-primary-foreground/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 z-0 size-[22rem] rounded-full border border-primary-foreground/10" aria-hidden="true" />
        </aside>
        <div className="flex flex-col bg-card">
          <header className="flex items-center justify-between border-b px-5 py-4"><Link href="/" className="lg:hidden"><BrandMark /></Link><span className="hidden lg:block" /><ThemeToggle /></header>
          <div className="grid flex-1 place-items-center px-5 py-10 sm:px-10">
            <div className="w-full max-w-[29rem] reveal-on-load">{children}</div>
          </div>
          <p className="flex items-center justify-center gap-2 border-t px-5 py-4 text-center text-xs leading-5 text-muted-foreground lg:hidden"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />Your account stays separate. Sharing starts only when you connect a partner.</p>
        </div>
      </section>
    </main>
  );
}
