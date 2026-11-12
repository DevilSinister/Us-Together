import { localDate } from "./calendar";
import type { Plan } from "./types";

const at = (day: string) => new Date(day + "T12:00:00Z");
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
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(plan.starts_at));
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
