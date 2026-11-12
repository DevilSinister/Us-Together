import { localDate } from "./calendar";
import type { Plan } from "./types";

const at = (day: string) => new Date(day + "T12:00:00Z");
// Server and browser ICU disagree on the spaces inside times ("7:30 PM", thin spaces in ranges),
// which breaks hydration; every time string here uses plain spaces.
export const plain = (text: string) => text.replace(/[   ]/g, " ");
const between = (from: string, to: string) => Math.round((at(to).getTime() - at(from).getTime()) / 86_400_000);
const lastDay = (plan: Pick<Plan, "starts_at" | "ends_at">, timezone: string) =>
  localDate(plan.ends_at && plan.ends_at > plan.starts_at ? new Date(Date.parse(plan.ends_at) - 1) : plan.starts_at, timezone);

/** The date tile: "NOV" over "14", in the couple's zone. */
export function dateTile(instant: string, timezone: string) {
  const day = localDate(instant, timezone);
  return { month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(at(day)).toUpperCase(), day: String(Number(day.slice(8))), date: day };
}

/** "Sat · 7:30 PM · Lakeside"; a plan over several days says "until Mon 14 Dec" instead of a weekday alone. */
export function planLine(plan: Pick<Plan, "starts_at" | "ends_at" | "location">, timezone: string, withTime = true) {
  const first = localDate(plan.starts_at, timezone), last = lastDay(plan, timezone);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(at(first));
  const time = plain(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(plan.starts_at)));
  const until = last > first ? "until " + new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(at(last)).replace(",", "") : null;
  return [weekday, withTime ? time : null, until, plan.location].filter(Boolean).join(" · ");
}

/** How far off the next plan is: "today", "tomorrow", "in 3 days", or "happening now" for one already under way. */
export function whenNext(plan: Pick<Plan, "starts_at" | "ends_at">, timezone: string, now = new Date()) {
  const today = localDate(now, timezone), first = localDate(plan.starts_at, timezone);
  if (Date.parse(plan.starts_at) <= now.getTime() && (first < today || (plan.ends_at && Date.parse(plan.ends_at) > now.getTime()))) return "happening now";
  const days = between(today, first);
  return days <= 0 ? "today" : days === 1 ? "tomorrow" : days < 14 ? `in ${days} days` : days < 60 ? `in ${Math.round(days / 7)} weeks` : `in ${Math.round(days / 30)} months`;
}

/** Where a planned plan stands against the clock: still ahead, under way, or every day of it gone. */
export function planPhase(plan: Pick<Plan, "starts_at" | "ends_at">, timezone: string, now = new Date()): "ahead" | "now" | "past" {
  if (lastDay(plan, timezone) < localDate(now, timezone)) return "past";
  return Date.parse(plan.starts_at) <= now.getTime() ? "now" : "ahead";
}

/**
 * The plan's time in full, in the couple's zone: "Saturday 14 November · 7:30 PM",
 * "… · 7:30 – 10:00 PM" with an end the same day, and both ends spelled out
 * when it runs over several days. The year appears only when it is not this one.
 */
export function planWhen(plan: Pick<Plan, "starts_at" | "ends_at">, timezone: string, now = new Date()) {
  const start = new Date(plan.starts_at), end = plan.ends_at && plan.ends_at > plan.starts_at ? new Date(plan.ends_at) : null;
  const year = localDate(start, timezone).slice(0, 4) !== localDate(now, timezone).slice(0, 4);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: year ? "numeric" : undefined, timeZone: timezone });
  const clock = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone });
  const time = (d: Date) => plain(clock.format(d));
  const date = (d: Date) => plain(day.format(d).replace(",", ""));
  if (!end) return `${date(start)} · ${time(start)}`;
  if (localDate(end, timezone) === localDate(start, timezone)) {
    // "6:00 – 8:00 PM": the shared AM or PM is said once.
    const [from, to] = [time(start), time(end)];
    const period = to.slice(to.lastIndexOf(" "));
    return `${date(start)} · ${from.endsWith(period) ? from.slice(0, -period.length) : from} – ${to}`;
  }
  return `${date(start)}, ${time(start)} – ${date(end)}, ${time(end)}`;
}

const offsets: Record<number, string> = { 0: "At the start", 15: "15 minutes before", 60: "An hour before", 1440: "The day before", 10080: "A week before" };
/** A reminder's offset in words. */
export function reminderLabel(minutes: number) {
  return offsets[minutes] ?? (minutes % 60 === 0 ? `${minutes / 60} hours before` : `${minutes} minutes before`);
}
/** When a reminder fires: a weekday within the coming week, a date beyond it. */
export function reminderWhen(dueAt: string, timezone: string, now = new Date()) {
  const due = new Date(dueAt), days = between(localDate(now, timezone), localDate(due, timezone));
  const time = plain(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(due));
  const date = days >= 0 && days < 7
    ? new Intl.DateTimeFormat("en", { weekday: "long", timeZone: timezone }).format(due)
    : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: timezone }).format(due).replace(",", "");
  return `${date} · ${time}`;
}
