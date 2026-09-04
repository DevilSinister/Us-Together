import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, CalendarHeart, Camera, CheckCircle2, Images, ListChecks, LockKeyhole, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { ThreadMarker } from "@/components/app/thread";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { bucketPreview } from "@/lib/bucket/preview";
import { relationshipDayCount } from "@/lib/dashboard/model";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home" };

type PlanRow = { id: string; title: string; starts_at: string; location: string | null };
type MemoryRow = { id: string; title: string; memory_date: string };
type MilestoneRow = { id: string; title: string; milestone_date: string; is_featured: boolean };
type NotificationRow = { id: string; title: string; read_at: string | null };

export default async function HomePage() {
  const identity = await getCurrentIdentity();
  let name: string | null = null;
  let timezone = "UTC";
  let onboardingCompleted = false;
  let coupleStatus: "solo" | "waiting" | "paired" = "solo";
  let relationshipStartedOn = "";
  let upcomingPlan: PlanRow | null = null;
  let recentMemory: MemoryRow | null = null;
  let featuredMilestone: MilestoneRow | null = null;
  let bucketTotal = 0;
  let bucketCompleted = 0;
  let notifications: NotificationRow[] = [];

  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    name = state.displayName || null;
    timezone = state.timezone;
    onboardingCompleted = state.onboardingCompleted;
    coupleStatus = state.coupleStatus;
    relationshipStartedOn = state.relationshipStartedOn;
    const plan = state.plans
      .filter((item) => item.status === "planned" && item.startsAt >= new Date().toISOString())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    upcomingPlan = plan ? { id: plan.id, title: plan.title, starts_at: plan.startsAt, location: plan.location || null } : null;
    const memory = [...state.memories].sort((a, b) => b.memoryDate.localeCompare(a.memoryDate) || b.id.localeCompare(a.id))[0];
    recentMemory = memory ? { id: memory.id, title: memory.title, memory_date: memory.memoryDate } : null;
    const milestone = [...state.milestones].sort((a, b) => Number(b.featured) - Number(a.featured) || b.milestoneDate.localeCompare(a.milestoneDate) || b.id.localeCompare(a.id))[0];
    featuredMilestone = milestone ? { id: milestone.id, title: milestone.title, milestone_date: milestone.milestoneDate, is_featured: milestone.featured } : null;
    const bucket = await bucketPreview(state.bucketSessionId);
    bucketTotal = bucket.items.length;
    bucketCompleted = bucket.items.filter((item) => item.status === "completed").length;
    notifications = state.notifications.slice(0, 5).map((item) => ({ id: item.id, title: item.title, read_at: item.readAt }));
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("display_name,timezone,onboarding_completed,relationship_started_on").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
    ]);
    name = profile?.display_name ?? null;
    timezone = profile?.timezone ?? "UTC";
    onboardingCompleted = profile?.onboarding_completed ?? false;
    relationshipStartedOn = profile?.relationship_started_on ?? "";
    coupleStatus = membership ? "waiting" : "solo";
    if (membership) {
      const { count } = await supabase.from("couple_memberships").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).is("left_at", null);
      if (count === 2) {
        coupleStatus = "paired";
        const [{ data: couple }, { data: plans }, { data: memories }, { data: milestones }, { count: totalIdeas }, { count: completedIdeas }, { data: notificationRows }] = await Promise.all([
          supabase.from("couples").select("relationship_started_on").eq("id", membership.couple_id).maybeSingle(),
          supabase.from("plans").select("id,title,starts_at,location").eq("couple_id", membership.couple_id).eq("status", "planned").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(1),
          supabase.from("memories").select("id,title,memory_date").eq("couple_id", membership.couple_id).order("memory_date", { ascending: false }).order("id", { ascending: false }).limit(1),
          supabase.from("milestones").select("id,title,milestone_date,is_featured").eq("couple_id", membership.couple_id).order("is_featured", { ascending: false }).order("milestone_date", { ascending: false }).order("id", { ascending: false }).limit(1),
          supabase.from("bucket_list_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id),
          supabase.from("bucket_list_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).eq("status", "completed"),
          supabase.from("notifications").select("id,title,read_at").eq("recipient_id", identity.userId).order("created_at", { ascending: false }).limit(5),
        ]);
        relationshipStartedOn = couple?.relationship_started_on ?? relationshipStartedOn;
        upcomingPlan = (plans?.[0] ?? null) as PlanRow | null;
        recentMemory = (memories?.[0] ?? null) as MemoryRow | null;
        featuredMilestone = (milestones?.[0] ?? null) as MilestoneRow | null;
        bucketTotal = totalIdeas ?? 0;
        bucketCompleted = completedIdeas ?? 0;
        notifications = (notificationRows ?? []) as NotificationRow[];
      }
    }
  }

  if (!onboardingCompleted) {
    return (
      <div className="mx-auto max-w-3xl reveal-on-load">
        <PageHeader
          rule={false}
          className="pb-0"
          eyebrow="Your setup is waiting"
          title="A few details make this space yours."
          lede="Add your name, local time, and—when you’re ready—the partner who will share this space."
        />
        <Button asChild className="mt-8"><Link href="/onboarding">Continue setup <ArrowRight className="size-4" /></Link></Button>
      </div>
    );
  }

  const dayCount = relationshipStartedOn ? relationshipDayCount(relationshipStartedOn, timezone) : null;
  const dateFormatter = new Intl.DateTimeFormat("en", { timeZone: timezone, month: "long", day: "numeric", year: "numeric" });
  const planFormatter = new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const daysUntilPlan = upcomingPlan ? Math.max(0, Math.ceil((new Date(upcomingPlan.starts_at).getTime() - new Date().getTime()) / 86_400_000)) : null;
  const planLead = daysUntilPlan === null ? "Coming up" : daysUntilPlan === 0 ? "Coming up · today" : `Coming up · in ${daysUntilPlan} ${daysUntilPlan === 1 ? "day" : "days"}`;

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow={name ? `Good to see you, ${name}` : "Welcome to Us Together"}
        title={dayCount === null ? "Your shared story has room for its first date." : `${dayCount.toLocaleString()} days of us—and counting.`}
        lede="What comes next, what you have kept, and the dates that hold the thread together."
        actions={<InlineLink href="/notifications"><Bell className="size-4" aria-hidden="true" />{unreadCount ? `${unreadCount} unread` : "Notifications"}</InlineLink>}
      />

      {coupleStatus !== "paired" ? (
        <PairingNotice
          title={coupleStatus === "waiting" ? "Your invitation is waiting for its person." : "Bring your partner into this private space."}
          body="The relationship dashboard opens only after two active accounts share the couple boundary."
          cta="View connection"
        />
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section aria-labelledby="thread-title">
            <div className="flex items-end justify-between gap-4">
              <h2 id="thread-title" className="font-display text-3xl">Today in your shared journal</h2>
              <span className="hidden text-sm text-muted-foreground sm:block">Shown in {timezone}</span>
            </div>
            <div className="relationship-thread mt-5 space-y-1">
              <article className="relative flex gap-5 py-5">
                <ThreadMarker icon={CalendarDays} muted={!upcomingPlan} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{planLead}</p>
                  <h3 className="mt-1 font-display text-3xl">{upcomingPlan?.title ?? "Give yourselves one thing to look forward to."}</h3>
                  {upcomingPlan ? (
                    <>
                      <p className="mt-2 leading-7 text-muted-foreground">{planFormatter.format(new Date(upcomingPlan.starts_at))}{upcomingPlan.location ? ` · ${upcomingPlan.location}` : ""}</p>
                      <InlineLink href={`/plans#${upcomingPlan.id}`} className="mt-3">Open plan <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                    </>
                  ) : (
                    <Button asChild className="mt-5"><Link href="/plans/new">Make a plan <Plus className="size-4" /></Link></Button>
                  )}
                </div>
              </article>

              <article className="relative flex gap-5 py-5">
                <ThreadMarker icon={CalendarHeart} muted={!featuredMilestone} />
                <div className="min-w-0">
                  {featuredMilestone ? (
                    <>
                      <p className="text-sm font-semibold text-primary">{featuredMilestone.is_featured ? "Featured moment" : "Latest moment"}</p>
                      <h3 className="mt-1 font-display text-3xl">{featuredMilestone.title}</h3>
                      <p className="mt-2 leading-7 text-muted-foreground">{dateFormatter.format(new Date(`${featuredMilestone.milestone_date}T00:00:00Z`))}</p>
                      <InlineLink href={`/milestones/${featuredMilestone.id}`} className="mt-3">Open moment <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                    </>
                  ) : (
                    <>
                      <h3 className="font-display text-3xl">Mark the date that began a chapter.</h3>
                      <Button asChild variant="outline" className="mt-4"><Link href="/milestones/new">Add a moment</Link></Button>
                    </>
                  )}
                </div>
              </article>

              {recentMemory ? (
                <article className="relative flex gap-5 py-5">
                  <ThreadMarker icon={Images} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">Recently kept</p>
                    <h3 className="mt-1 font-display text-3xl">{recentMemory.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{dateFormatter.format(new Date(`${recentMemory.memory_date}T00:00:00Z`))}</p>
                    <InlineLink href={`/memories/${recentMemory.id}`} className="mt-3">Open memory <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                  </div>
                </article>
              ) : null}

              {bucketTotal ? (
                <article className="relative flex gap-5 py-5">
                  <ThreadMarker icon={CheckCircle2} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">Bucket progress</p>
                    <h3 className="mt-1 font-display text-3xl">{bucketCompleted} of {bucketTotal} dreams completed.</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">Only shared bucket items contribute to this count.</p>
                    <InlineLink href="/bucket" className="mt-3">Open bucket lists <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                  </div>
                </article>
              ) : null}
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <p className="text-sm font-semibold text-primary">Start something</p>
              <h2 className="mt-2 font-display text-3xl">Keep the thread moving.</h2>
              <nav className="mt-5 grid gap-2" aria-label="Create">
                <Button asChild className="justify-start"><Link href="/plans/new"><CalendarDays className="size-4" />New plan</Link></Button>
                <Button asChild variant="outline" className="justify-start"><Link href="/memories/new"><Sparkles className="size-4" />Add a memory</Link></Button>
                <Button asChild variant="outline" className="justify-start"><Link href="/milestones/new"><CalendarHeart className="size-4" />Add a moment</Link></Button>
                <Button asChild variant="outline" className="justify-start"><Link href="/bucket/new"><ListChecks className="size-4" />Keep an idea</Link></Button>
              </nav>
              <InlineLink href="/gallery" className="mt-4"><Camera className="size-4" aria-hidden="true" />Open gallery</InlineLink>
            </section>
            <section className="rounded-panel bg-secondary p-6">
              <div className="flex gap-3">
                <LockKeyhole className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl">Safe projections only.</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Home reads shared plans, memories, moments, and bucket counts. Private or secret content is never counted, previewed, or copied into notifications.</p>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-5 w-full"><Link href="/notifications">Notification settings</Link></Button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
