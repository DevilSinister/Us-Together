/** A notification as the inbox reads it. Categories keep their database names ('milestone', 'note', ...). */
export type NotificationRow = { id: string; title: string; category: string; target_type: string | null; target_id: string | null; read_at: string | null; created_at: string };

/** Where an envelope with no target lands: a deletion points at the section it left. */
const sectionHrefs: Record<string, string> = { plan: "/plans", memory: "/memories", milestone: "/milestones", note: "/notes", bucket: "/bucket", wishlist: "/wishlist", drawing: "/drawings" };
const targetPaths: Record<string, string> = {
  milestone: "/milestones/", plan: "/plans/", memory: "/memories/", bucket_list: "/bucket/lists/", bucket: "/bucket/",
  wishlist: "/wishlist/", drawing: "/drawings/", note: "/notes/",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The page a notification opens. Built from the stored row on the server, so it is always one of the app's own paths. */
export function notificationHref(row: Pick<NotificationRow, "category" | "target_type" | "target_id">) {
  if (!row.target_id) return sectionHrefs[row.category] ?? "/home";
  const path = row.target_type ? targetPaths[row.target_type] : undefined;
  return path && uuid.test(row.target_id) ? path + row.target_id : "/home";
}

/** Categories whose notifications come from your partner's own hand; the rest (reminders, On this day, system) are the app's. */
export const fromPartner = new Set(["note", "drawing", "memory", "milestone", "wishlist", "bucket"]);

/** "9 minutes ago", "2 hours ago", "Yesterday", "3 days ago", then the date: the inbox's sense of when. */
export function relativeWhen(iso: string, now: Date, timeZone: string) {
  const then = new Date(iso);
  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const day = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const days = Math.round((Date.parse(day(now) + "T12:00:00Z") - Date.parse(day(then) + "T12:00:00Z")) / 86_400_000);
  if (days === 0) { const hours = Math.round(minutes / 60); return `${hours} ${hours === 1 ? "hour" : "hours"} ago`; }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const sameYear = day(now).slice(0, 4) === day(then).slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: sameYear ? undefined : "numeric" }).format(then);
}
