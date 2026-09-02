import { z } from "zod";
import type { Plan } from "./types";
import { isValidTimeZone } from "@/lib/dream/schema";

export const calendarFilter = z.object({
  view: z.enum(["upcoming", "month", "week"]).default("upcoming"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v).optional(),
  status: z.enum(["planned", "completed", "cancelled", "all"]).default("planned"),
  cursor: z.object({ starts_at: z.iso.datetime({ offset: true }), id: z.uuid() }).optional(),
});
export function localDate(instant: string | Date, timezone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: isValidTimeZone(timezone) ? timezone : "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
  return p.year + "-" + p.month + "-" + p.day;
}
export function localInput(instant: string, timezone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
  return p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute;
}
export function addDays(day: string, count: number) {
  const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10);
}
export function calendarDays(view: "week" | "month", anchor: string) {
  const date = new Date(anchor + "T12:00:00Z");
  if (view === "month") date.setUTCDate(1);
  const start = addDays(date.toISOString().slice(0, 10), -((date.getUTCDay() + 6) % 7));
  return Array.from({ length: view === "month" ? 42 : 7 }, (_, i) => addDays(start, i));
}
export function plansOnDay(plans: Plan[], day: string, timezone: string) {
  return plans.filter((p) => localDate(p.starts_at, timezone) <= day && localDate(p.ends_at && p.ends_at > p.starts_at ? new Date(Date.parse(p.ends_at) - 1) : p.starts_at, timezone) >= day);
}
