"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { syncDeviceTimeZoneAction } from "@/app/actions/profile";
import { deviceTimeZone } from "@/lib/time/zone";

/**
 * Keeps the profile zone equal to the zone this device is in.
 *
 * Renders nothing. When the device reports a different zone from the one the
 * page was rendered in, it saves the device zone once and re-renders, so the
 * next paint of every plan, comment and notification is in local time.
 */
export function TimeZoneSync({ current }: { current: string }) {
  const router = useRouter();
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    const zone = deviceTimeZone();
    if (!zone || zone === current || attempted.current === zone) return;
    attempted.current = zone;
    void syncDeviceTimeZoneAction(zone)
      .then(result => { if (result.changed) router.refresh(); })
      .catch(() => { attempted.current = null; });
  }, [current, router]);
  return null;
}
