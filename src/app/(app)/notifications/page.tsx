import type { Metadata } from "next";
import { Bell, Check } from "lucide-react";
import { markNotificationReadAction } from "@/app/actions/dashboard";
import { NotificationPreferencesForm } from "@/components/dashboard/notification-preferences-form";
import { DeviceAlerts } from "@/components/app/device-alerts";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/states";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };
type NotificationRow = { id: string; title: string; category: string; target_type: string | null; target_id: string | null; read_at: string | null; created_at: string };
type Preferences = { inAppEnabled: boolean; plansEnabled: boolean; memoriesEnabled: boolean; milestonesEnabled: boolean; notesEnabled: boolean; onThisDayEnabled: boolean };
const defaults: Preferences = { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true, onThisDayEnabled: true };

/**
 * Stored categories keep their database names ('milestone', 'note', ...). Only the
 * reader-facing label follows the product's vocabulary.
 */
const categoryLabels: Record<string, string> = { plan: "Plan", memory: "Memory", milestone: "Moment", note: "Note", system: "System", on_this_day: "On this day" };

function targetHref(notification: NotificationRow) {
  if (!notification.target_id) return "/home";
  if (notification.target_type === "milestone") return `/milestones/${notification.target_id}`;
  if (notification.target_type === "plan") return `/plans/${notification.target_id}`;
  if (notification.target_type === "memory") return `/memories/${notification.target_id}`;
  if (notification.target_type === "note") return `/notes/${notification.target_id}`;
  return "/home";
}

export default async function NotificationsPage() {
  const identity = await getCurrentIdentity();
  let notifications: NotificationRow[] = [];
  let preferences = defaults;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    notifications = state.notifications.map((item) => ({ id: item.id, title: item.title, category: item.category, target_type: item.targetType, target_id: item.targetId, read_at: item.readAt, created_at: item.createdAt }));
    preferences = state.notificationPreferences;
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: rows }, { data: row }] = await Promise.all([
      supabase.from("notifications").select("id,title,category,target_type,target_id,read_at,created_at").eq("recipient_id", identity.userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("notification_preferences").select("in_app_enabled,plans_enabled,memories_enabled,milestones_enabled,notes_enabled,on_this_day_enabled").eq("user_id", identity.userId).maybeSingle(),
    ]);
    notifications = (rows ?? []) as NotificationRow[];
    if (row) preferences = { inAppEnabled: row.in_app_enabled, plansEnabled: row.plans_enabled, memoriesEnabled: row.memories_enabled, milestonesEnabled: row.milestones_enabled, notesEnabled: row.notes_enabled, onThisDayEnabled: row.on_this_day_enabled };
  }
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="Quiet updates"
        title="Notifications without the private details."
        lede="The inbox says what changed. Shared content is fetched only after your membership is checked."
      />
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="inbox-title">
          <div className="flex items-center justify-between gap-4">
            <h2 id="inbox-title" className="font-display text-3xl">Inbox</h2>
            <span className="text-sm text-muted-foreground">{unread} unread</span>
          </div>
          {notifications.length ? (
            <div className="mt-5 divide-y border-y">
              {notifications.map((notification) => (
                <article key={notification.id} className="flex gap-4 py-5">
                  <Bell aria-hidden="true" className={`mt-1 size-5 shrink-0 ${notification.read_at ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{notification.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{formatter.format(new Date(notification.created_at))} · {categoryLabels[notification.category] ?? notification.category}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <InlineLink href={targetHref(notification)}>Open update</InlineLink>
                      {!notification.read_at ? (
                        <form action={markNotificationReadAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <Button variant="ghost" size="sm"><Check className="size-4" />Mark read</Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-8"
              icon={Bell}
              title="All quiet here."
              body="New shared activity will appear without copying its private content into this inbox."
            />
          )}
        </section>
        <aside className="space-y-8">
          <div className="rounded-panel bg-secondary p-6">
            <NotificationPreferencesForm preferences={preferences} />
          </div>
          <div className="rounded-panel bg-secondary p-6">
            <DeviceAlerts />
          </div>
        </aside>
      </div>
    </div>
  );
}
