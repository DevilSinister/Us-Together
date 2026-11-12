import { WifiOff } from "lucide-react";

/**
 * Shown by the service worker when a page cannot load (ADR-053): a round mark,
 * "You're offline.", one honest line and Try again. The worker serves this in
 * place of the address you asked for, so Try again is a plain link to that same
 * address: it reloads what you meant to open, and works even when the app's
 * scripts were never cached.
 */
export default function OfflinePage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-8 py-12">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-secondary"><WifiOff className="size-6" aria-hidden="true" /></span>
        <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">You&rsquo;re offline.</h1>
        <p className="text-base leading-[1.6] text-muted-foreground">Your private space opens again as soon as you reconnect.</p>
        {/* An empty href is the current address: reloading it needs no script. */}
        <a href="" className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">Try again</a>
      </div>
    </main>
  );
}
