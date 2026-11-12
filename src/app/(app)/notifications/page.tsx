import type { Metadata } from "next";
import { Bell, ChevronDown } from "lucide-react";
import { markAllNotificationsReadAction } from "@/app/actions/dashboard";
import { NotificationPreferencesForm } from "@/components/dashboard/notification-preferences-form";
import { DeviceAlerts } from "@/components/app/device-alerts";
import { Avatar } from "@/components/app/avatar";
import { Cover, CoverSheet } from "@/components/app/cover";
import { EmptyState } from "@/components/app/states";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { loadIdentities, type Identities } from "@/lib/avatar/identities";
import { fromPartner, relativeWhen, type NotificationRow } from "@/lib/notifications/links";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/time/viewer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };
type Preferences = { inAppEnabled: boolean; plansEnabled: boolean; memoriesEnabled: boolean; milestonesEnabled: boolean; notesEnabled: boolean; onThisDayEnabled: boolean; bucketEnabled: boolean; wishlistEnabled: boolean; drawingsEnabled: boolean };
const defaults: Preferences = { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true, onThisDayEnabled: true, bucketEnabled: true, wishlistEnabled: true, drawingsEnabled: true };

/**
 * Notifications as a Cover screen (ADR-053). The band says how many are
 * unread. New and Earlier are ruled rows: your partner's face for what they
 * did, a bell for what the app is reminding you of, when it happened, and the
 * line itself, bold with a rose dot while unread. A row opens through
 * `/notifications/{id}/open`, which marks it read and goes where it points.
 * Preferences and device alerts wait behind "Notification settings".
 */
export default async function NotificationsPage() {
  const identity = await getCurrentIdentity();
  let notifications: NotificationRow[] = [];
  let preferences = defaults;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    notifications = state.notifications
      .map((item) => ({ id: item.id, title: item.title, category: item.category, target_type: item.targetType, target_id: item.targetId, read_at: item.readAt, created_at: item.createdAt }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    preferences = state.notificationPreferences;
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: rows }, { data: row }] = await Promise.all([
      supabase.from("notifications").select("id,title,category,target_type,target_id,read_at,created_at").eq("recipient_id", identity.userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("notification_preferences").select("in_app_enabled,plans_enabled,memories_enabled,milestones_enabled,notes_enabled,on_this_day_enabled,bucket_enabled,wishlist_enabled,drawings_enabled").eq("user_id", identity.userId).maybeSingle(),
    ]);
    notifications = (rows ?? []) as NotificationRow[];
    if (row) preferences = { inAppEnabled: row.in_app_enabled, plansEnabled: row.plans_enabled, memoriesEnabled: row.memories_enabled, milestonesEnabled: row.milestones_enabled, notesEnabled: row.notes_enabled, onThisDayEnabled: row.on_this_day_enabled, bucketEnabled: row.bucket_enabled, wishlistEnabled: row.wishlist_enabled, drawingsEnabled: row.drawings_enabled };
  }
  const [timeZone, identities] = await Promise.all([getViewerTimeZone(), loadIdentities()]);
  const now = new Date();
  const fresh = notifications.filter((item) => !item.read_at);
  const earlier = notifications.filter((item) => item.read_at);

  return (
    <>
      <Cover labelledBy="notifications-title" height="band">
        <h1 id="notifications-title" className="font-display text-[2.25rem] leading-[1.05] tracking-[-0.02em]">Notifications</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">{fresh.length ? `${fresh.length} unread` : "All caught up"}</p>
      </Cover>

      <CoverSheet>
        <div className="flex max-w-2xl flex-col gap-6">
          {notifications.length ? (
            <>
              {fresh.length ? (
                <section aria-labelledby="new-title" className="flex flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="new-title" className="text-[0.8125rem] font-semibold text-primary">New</h2>
                    <form action={markAllNotificationsReadAction}>
                      <button className="inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Mark all read</button>
                    </form>
                  </div>
                  <Rows items={fresh} identities={identities} now={now} timeZone={timeZone} />
                </section>
              ) : null}
              {earlier.length ? (
                <section aria-labelledby="earlier-title" className="flex flex-col">
                  <h2 id="earlier-title" className="py-3 text-[0.8125rem] font-semibold text-primary">Earlier</h2>
                  <Rows items={earlier} identities={identities} now={now} timeZone={timeZone} />
                </section>
              ) : null}
            </>
          ) : (
            <EmptyState className="mt-0" icon={Bell} title="All quiet here." body="New shared activity appears here, without copying its private content into the inbox." />
          )}

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-control border border-border px-3.5 text-sm font-semibold transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
              Notification settings
              <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-panel bg-secondary p-5"><NotificationPreferencesForm preferences={preferences} /></div>
              <div className="rounded-panel bg-secondary p-5"><DeviceAlerts /></div>
            </div>
          </details>
          <p className="text-[0.8125rem] leading-5 text-muted-foreground">The inbox says what changed, never the private details. What it points to opens only after your membership is checked.</p>
        </div>
      </CoverSheet>
    </>
  );
}

function Rows({ items, identities, now, timeZone }: { items: NotificationRow[]; identities: Identities; now: Date; timeZone: string }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const unread = !item.read_at;
        return (
          <li key={item.id} className="border-b border-border last:border-0">
            {/* A plain anchor, not a prefetching Link: opening is what marks it read. */}
            <a href={`/notifications/${item.id}/open`} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {fromPartner.has(item.category)
                ? <Avatar name={identities.partner.name} src={identities.partner.src} style={identities.partner.style} size="md" className="size-11 shrink-0" />
                : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><Bell className="size-5" aria-hidden="true" /></span>}
              <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                <span className={cn("break-words text-[1.0625rem] leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none", unread ? "font-semibold" : "font-normal")}>{item.title}</span>
                <span className="text-[0.8125rem] leading-5 text-muted-foreground"><time dateTime={item.created_at}>{relativeWhen(item.created_at, now, timeZone)}</time></span>
              </span>
              {unread ? <span role="img" aria-label="Unread" className="size-2 shrink-0 rounded-full bg-rose" /> : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
