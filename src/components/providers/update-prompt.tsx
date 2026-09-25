"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION, isBehindDeployment, parseServedVersion } from "@/lib/app-version";

const CHECK_EVERY_MS = 5 * 60_000;
// Focus, visibility and reconnection can fire together; one request covers all three.
const MIN_GAP_MS = 60_000;
const SNOOZE_MS = 30 * 60_000;

/**
 * Tells an open tab, the installed PWA and the Android app's Trusted Web Activity
 * that a newer deployment is live, and moves them onto it.
 *
 * It asks rather than reloading on its own, because a reload discards whatever is
 * half-typed or half-drawn on the page. The one automatic step is a change of page:
 * by then the previous page is gone anyway, so the next page loads fresh from the new
 * deployment instead of carrying the old bundle forward.
 */
export function UpdatePrompt() {
  const pathname = usePathname();
  const [behind, setBehind] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const pathAtDetection = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!APP_VERSION || behind) return;
    // The page just loaded from the current deployment, so the first check can wait.
    let lastCheck = Date.now();
    let cancelled = false;

    const check = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < MIN_GAP_MS) return;
      lastCheck = Date.now();
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        if (isBehindDeployment(APP_VERSION, parseServedVersion(await response.json())) && !cancelled) {
          pathAtDetection.current = pathnameRef.current;
          setBehind(true);
        }
      } catch {
        // Offline or mid-deploy: the next focus or interval tries again.
      }
    };

    const onWake = () => void check();
    const timer = window.setInterval(onWake, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [behind]);

  useEffect(() => {
    if (behind && pathAtDetection.current !== null && pathname !== pathAtDetection.current) {
      window.location.reload();
    }
  }, [behind, pathname]);

  useEffect(() => {
    if (!snoozed) return;
    const timer = window.setTimeout(() => setSnoozed(false), SNOOZE_MS);
    return () => window.clearTimeout(timer);
  }, [snoozed]);

  if (!behind || snoozed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(.75rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-x-4 gap-y-3 rounded-panel border border-border bg-card px-4 py-3 text-card-foreground shadow-paper">
        <p className="min-w-0 flex-1 basis-56 text-sm">
          <span className="font-semibold">A new version is ready.</span>{" "}
          <span className="text-muted-foreground">It loads when you next change page, or refresh now.</span>
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSnoozed(true)}>
            Later
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
