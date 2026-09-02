import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { markNotificationReadAction } from "@/app/actions/dashboard";
import { NotificationPreferencesForm } from "@/components/dashboard/notification-preferences-form";
import { Button } from "@/components/ui/button";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };
type NotificationRow = { id: string; title: string; category: string; target_type: string | null; target_id: string | null; read_at: string | null; created_at: string };
type Preferences = { inAppEnabled: boolean; plansEnabled: boolean; memoriesEnabled: boolean; milestonesEnabled: boolean; notesEnabled: boolean };
const defaults: Preferences = { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true };

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
      supabase.from("notification_preferences").select("in_app_enabled,plans_enabled,memories_enabled,milestones_enabled,notes_enabled").eq("user_id", identity.userId).maybeSingle(),
    ]);
    notifications = (rows ?? []) as NotificationRow[];
    if (row) preferences = { inAppEnabled: row.in_app_enabled, plansEnabled: row.plans_enabled, memoriesEnabled: row.memories_enabled, milestonesEnabled: row.milestones_enabled, notesEnabled: row.notes_enabled };
  }
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
  return <div className="reveal-on-load"><header className="border-b pb-8"><p className="text-sm font-semibold text-primary">Quiet updates</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Notifications without the private details.</h1><p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted-foreground">The inbox says what changed. Shared content is fetched only after your membership is checked.</p></header><div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]"><section aria-labelledby="inbox-title"><div className="flex items-center justify-between gap-4"><h2 id="inbox-title" className="font-display text-3xl">Inbox</h2><span className="text-sm text-muted-foreground">{notifications.filter((item) => !item.read_at).length} unread</span></div>{notifications.length ? <div className="mt-5 divide-y border-y">{notifications.map((notification) => { const href = notification.target_type === "milestone" && notification.target_id ? `/milestones#${notification.target_id}` : "/home"; return <article key={notification.id} className="flex gap-4 py-5"><Bell className={`mt-1 size-5 shrink-0 ${notification.read_at ? "text-muted-foreground" : "text-primary"}`} /><div className="min-w-0 flex-1"><h3 className="font-semibold">{notification.title}</h3><p className="mt-1 text-sm text-muted-foreground">{formatter.format(new Date(notification.created_at))} · {notification.category}</p><div className="mt-3 flex flex-wrap gap-3"><Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Open update</Link>{!notification.read_at ? <form action={markNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id} /><Button variant="ghost" size="sm"><Check className="size-4" />Mark read</Button></form> : null}</div></div></article>; })}</div> : <div className="mt-8"><Bell className="size-7 text-primary" /><h3 className="mt-4 font-display text-3xl">All quiet here.</h3><p className="mt-3 text-muted-foreground">New shared activity will appear without copying its private content into this inbox.</p></div>}</section><aside className="h-fit rounded-[1rem] bg-secondary p-6"><NotificationPreferencesForm preferences={preferences} /></aside></div></div>;
}
