"use client";
import { useSyncExternalStore } from "react";
import { Clock } from "lucide-react";
import { deviceTimeZone } from "@/lib/time/zone";

const noSubscription = () => () => {};

/**
 * The time zone, taken from the device rather than typed.
 *
 * Asking people for an IANA name is how every profile ended up on UTC. The
 * zone is read where the person is and submitted with the form; the server
 * render uses the saved zone until the browser can say where it is.
 */
export function DeviceTimeZoneField({ saved }: { saved: string }) {
  const zone = useSyncExternalStore(noSubscription, () => deviceTimeZone() ?? saved, () => saved);
  return (
    <div className="flex items-start gap-3 rounded-panel bg-secondary/60 px-4 py-3">
      <input type="hidden" name="timezone" value={zone} />
      <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm leading-6">
        <span className="block font-semibold">Your local time: {zone.replaceAll("_", " ")}</span>
        <span className="block text-muted-foreground">Taken from this device, so plans, notes and notifications follow you wherever you are.</span>
      </p>
    </div>
  );
}
