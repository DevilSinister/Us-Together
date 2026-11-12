import Link from "next/link";

/**
 * The signed-out screens in the Cover language (ADR-053): a cover with the
 * wordmark at its head and the screen's title at its foot, then the form on a
 * sheet that overlaps it. There is no photograph before you sign in, so the
 * cover field carries a soft rose light instead. From desktop width the cover
 * becomes a full-height panel beside the form.
 */
export function AuthShell({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <section aria-labelledby="auth-title" className="on-cover relative isolate flex h-[22.5rem] flex-col justify-between overflow-hidden bg-cover-field px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:p-12">
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(110%_75%_at_85%_0%,color-mix(in_oklch,var(--rose)_34%,transparent),transparent_62%),radial-gradient(80%_60%_at_0%_100%,color-mix(in_oklch,var(--rose)_16%,transparent),transparent_70%)]" />
        <Link href="/" className="self-start rounded-control font-display text-[1.1875rem] text-[var(--cover-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Us Together</Link>
        <div className="cover-rise max-w-xl">
          <h1 id="auth-title" className="text-balance font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] lg:text-6xl">{title}</h1>
          <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground lg:text-lg">{lede}</p>
        </div>
      </section>
      <div className="reveal-on-load relative -mt-6 rounded-t-surface bg-background px-5 pb-10 pt-6 sm:px-8 lg:mt-0 lg:flex lg:items-center lg:rounded-none lg:px-12">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
