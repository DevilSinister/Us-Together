"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, CircleAlert, CircleCheck, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Installing the app and turning on push are one decision on iOS, where Web Push
 * only works once the app is on the Home Screen. Presenting them as two unrelated
 * switches would let someone enable alerts that could never arrive, so this panel
 * states the dependency and hides the toggle until it is satisfiable.
 *
 * Chrome fires beforeinstallprompt and gives us a real install button. iOS fires
 * nothing and exposes no install API at all, so the only honest thing to show
 * there is the manual Share sheet path.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Status = { tone: "success" | "error"; message: string } | null;

/**
 * Environment facts are read through useSyncExternalStore rather than set from an
 * effect. Setting them in an effect would render once with the server's answer and
 * again with the browser's, which both cascades a render and briefly shows the wrong
 * install instructions. The server snapshot is false everywhere: it cannot know what
 * this device supports, and false renders the safe instruction-only state.
 */
const neverChanges = () => () => {};
const onServer = () => false;

function subscribeToDisplayMode(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches
  || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

// Chrome and Firefox on iOS are WebKit wrappers, and neither offers the Share-sheet
// install path Safari does, so they are excluded from the iOS instructions.
const isIosSafari = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);

const isPushCapable = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The uncompressed P-256 point the push service expects as raw bytes. */
function applicationServerKey(base64url: string) {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function DeviceAlerts() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const installed = useSyncExternalStore(subscribeToDisplayMode, isInstalled, onServer);
  const iosSafari = useSyncExternalStore(neverChanges, isIosSafari, onServer);
  const supported = useSyncExternalStore(neverChanges, isPushCapable, onServer);

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const clear = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", clear);

    // Asynchronous, so this reflects what the browser already holds without racing
    // the first paint or claiming a subscription exists before it is confirmed.
    void navigator.serviceWorker?.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => setSubscribed(false));

    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", clear);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  const enable = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // A denied permission cannot be re-requested from script; say so plainly.
        setStatus({ tone: "error", message: permission === "denied" ? "Your browser is blocking notifications for this site. Allow them in site settings, then try again." : "Notifications were not enabled." });
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(vapidKey) });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) {
        // Leaving a browser subscription the server does not know about would go
        // silently undelivered, so it is withdrawn rather than left dangling.
        await subscription.unsubscribe().catch(() => undefined);
        const body = await response.json().catch(() => ({}));
        setStatus({ tone: "error", message: body.error ?? "We could not turn on alerts for this device." });
        return;
      }
      setSubscribed(true);
      setStatus({ tone: "success", message: "Alerts are on for this device." });
    } catch {
      setStatus({ tone: "error", message: "We could not turn on alerts for this device." });
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setStatus({ tone: "success", message: "Alerts are off for this device." });
    } catch {
      setStatus({ tone: "error", message: "We could not turn off alerts for this device." });
    } finally {
      setBusy(false);
    }
  }, []);

  // iOS refuses push to a browser tab, so the toggle would fail every time.
  const pushReady = supported && Boolean(vapidKey) && (!iosSafari || installed);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">This device</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Install the app to keep it one tap away, and choose whether this device shows an alert when something shared changes.
        </p>
      </div>

      {installed ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />Installed on this device.</p>
      ) : installEvent ? (
        <Button onClick={install} className="w-full justify-center"><Download className="size-4" />Install the app</Button>
      ) : iosSafari ? (
        <p className="flex gap-2 text-sm leading-6 text-muted-foreground">
          <Share className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>To install: tap Share, then <strong className="font-semibold text-foreground">Add to Home Screen</strong>. On iPhone and iPad, alerts work only after that.</span>
        </p>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">Your browser offers installation from its own menu — look for Install or Add to Home Screen.</p>
      )}

      <div className="border-t pt-5">
        {pushReady ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              An alert names what changed and nothing more. A partner&apos;s private note and any gift plan never produce one.
            </p>
            <Button
              onClick={subscribed ? disable : enable}
              disabled={busy}
              variant={subscribed ? "outline" : "default"}
              className="mt-4 w-full justify-center"
            >
              <BellRing className="size-4" />
              {busy ? "Saving…" : subscribed ? "Turn off alerts on this device" : "Turn on alerts on this device"}
            </Button>
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {!supported ? "This browser cannot show alerts. The inbox above still records everything."
              : !vapidKey ? "Alerts are not configured on this deployment yet."
              : "Add the app to your Home Screen first — iPhone and iPad only allow alerts for an installed app."}
          </p>
        )}
        {status ? (
          <div className={`status-message mt-4 ${status.tone === "success" ? "status-success" : "status-error"}`} role="status">
            {status.tone === "success" ? <CircleCheck className="size-5 shrink-0" /> : <CircleAlert className="size-5 shrink-0" />}
            {status.message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
