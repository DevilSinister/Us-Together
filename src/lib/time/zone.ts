import { isValidTimeZone, zonedLocalToUtc } from "@/lib/dream/schema";

/**
 * Where the person is, as their device reports it.
 *
 * Every profile used to start on UTC, and nothing ever asked the device, so a
 * couple in Karachi saw every plan, comment and notification five hours off.
 * The device zone follows the person when they travel, which is what "local
 * time" means to them; the profile keeps a copy so work done without a
 * browser — reminders, On this day, the Android widget — uses the same zone.
 */
export function deviceTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isValidTimeZone(zone) ? zone : null;
  } catch {
    return null;
  }
}

/** `YYYY-MM-DDTHH:mm` as a wall clock in `timeZone` shows it. */
export function wallClock(iso: string, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso)).map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Keep the time someone typed when only the zone it was typed in was wrong.
 *
 * A plan entered as 7:00 PM while the profile still said UTC was stored as
 * 19:00Z. Once the real zone is known, the honest repair is 7:00 PM in that
 * zone, not the same instant read on a different clock. A wall clock that does
 * not exist in the new zone (a spring-forward gap) keeps its instant rather
 * than inventing a neighbouring time; one that occurs twice takes the earlier.
 */
export function reanchorWallClock(iso: string, from: string, to: string): string {
  try {
    return zonedLocalToUtc(wallClock(iso, from), to, "earlier");
  } catch {
    return new Date(iso).toISOString();
  }
}
