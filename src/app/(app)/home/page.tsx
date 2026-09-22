import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Brush, CalendarDays, CalendarHeart, Camera, CheckCircle2, Gift, Images, ListChecks, LockKeyhole, NotebookPen, Plus, Sparkles } from "lucide-react";
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
type NoteRow = { id: string; title: string; type: string; mine: boolean };
type DrawingRow = { id: string; mine: boolean; sent_at: string | null };

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
  let recentNote: NoteRow | null = null;
  let recentDrawing: DrawingRow | null = null;
  let wishlistCount = 0;

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
        const [{ data: couple }, { data: plans }, { data: memories }, { data: milestones }, { count: totalIdeas }, { count: completedIdeas }, { data: notificationRows }, { data: noteRows }, { count: wishCount }, { data: drawingRows }] = await Promise.all([
          supabase.from("couples").select("relationship_started_on").eq("id", membership.couple_id).maybeSingle(),
          supabase.from("plans").select("id,title,starts_at,location").eq("couple_id", membership.couple_id).eq("status", "planned").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(1),
          supabase.from("memories").select("id,title,memory_date").eq("couple_id", membership.couple_id).order("memory_date", { ascending: false }).order("id", { ascending: false }).limit(1),
          supabase.from("milestones").select("id,title,milestone_date,is_featured").eq("couple_id", membership.couple_id).order("is_featured", { ascending: false }).order("milestone_date", { ascending: false }).order("id", { ascending: false }).limit(1),
          supabase.from("bucket_list_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id),
          supabase.from("bucket_list_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).eq("status", "completed"),
          supabase.from("notifications").select("id,title,read_at").eq("recipient_id", identity.userId).order("created_at", { ascending: false }).limit(5),
          // Row level security decides which notes are visible; a partner private note never arrives.
          supabase.from("notes").select("id,title,type,author_id").eq("couple_id", membership.couple_id).order("updated_at", { ascending: false }).limit(1),
          supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id),
          // Only ready drawings are visible to both partners; the image route re-authorizes on read.
          supabase.from("drawing_notes").select("id,author_id,sent_at").eq("couple_id", membership.couple_id).eq("status", "ready").order("sent_at", { ascending: false }).order("id", { ascending: false }).limit(1),
        ]);
        relationshipStartedOn = couple?.relationship_started_on ?? relationshipStartedOn;
        upcomingPlan = (plans?.[0] ?? null) as PlanRow | null;
        recentMemory = (memories?.[0] ?? null) as MemoryRow | null;
        featuredMilestone = (milestones?.[0] ?? null) as MilestoneRow | null;
        bucketTotal = totalIdeas ?? 0;
        bucketCompleted = completedIdeas ?? 0;
        notifications = (notificationRows ?? []) as NotificationRow[];
        const note = noteRows?.[0];
        recentNote = note ? { id: note.id, title: note.title, type: note.type, mine: note.author_id === identity.userId } : null;
        const drawing = drawingRows?.[0];
        recentDrawing = drawing ? { id: drawing.id, mine: drawing.author_id === identity.userId, sent_at: drawing.sent_at } : null;
        wishlistCount = wishCount ?? 0;
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
                      <h3 className="mt-1 font-display text-2xl">{featuredMilestone.title}</h3>
                      <p className="mt-2 leading-7 text-muted-foreground">{dateFormatter.format(new Date(`${featuredMilestone.milestone_date}T00:00:00Z`))}</p>
                      <InlineLink href={`/milestones/${featuredMilestone.id}`} className="mt-3">Open moment <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                    </>
                  ) : (
                    <>
                      <h3 className="font-display text-2xl">Mark the date that began a chapter.</h3>
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
                    <h3 className="mt-1 font-display text-2xl">{recentMemory.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{dateFormatter.format(new Date(`${recentMemory.memory_date}T00:00:00Z`))}</p>
                    <InlineLink href={`/memories/${recentMemory.id}`} className="mt-3">Open memory <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                  </div>
                </article>
              ) : null}

              {recentNote ? (
                <article className="relative flex gap-5 py-5">
                  <ThreadMarker icon={NotebookPen} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{recentNote.type === "private" ? "Your private note" : recentNote.mine ? "You shared a note" : "Your partner left a note"}</p>
                    <h3 className="mt-1 break-words font-display text-2xl">{recentNote.title}</h3>
                    <InlineLink href={`/notes/${recentNote.id}`} className="mt-3">Open note <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                  </div>
                </article>
              ) : null}

              {recentDrawing ? (
                <article className="relative flex gap-5 py-5">
                  <ThreadMarker icon={Brush} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{recentDrawing.mine ? "You sent a drawing" : "Your partner sent a drawing"}</p>
                    <h3 className="mt-1 font-display text-2xl">A little something, drawn by hand.</h3>
                    <Link href={`/drawings/${recentDrawing.id}`} className="mt-3 block w-56 overflow-hidden rounded-panel bg-white shadow-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/drawing-notes/${recentDrawing.id}/image`} alt={recentDrawing.mine ? "The drawing you sent" : "The drawing your partner sent"} className="aspect-[4/3] w-full object-contain" />
                    </Link>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <InlineLink href={`/drawings/${recentDrawing.id}`}>Open drawing <ArrowRight className="size-4" aria-hidden="true" /></InlineLink>
                      <Button asChild variant="outline" size="sm"><Link href="/drawings/new"><Brush className="size-4" />{recentDrawing.mine ? "Draw another" : "Draw back"}</Link></Button>
                    </div>
                  </div>
                </article>
              ) : null}

              {bucketTotal ? (
                <article className="relative flex gap-5 py-5">
                  <ThreadMarker icon={CheckCircle2} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">Bucket progress</p>
                    <h3 className="mt-1 text-xl font-semibold">{bucketCompleted} of {bucketTotal} dreams completed.</h3>
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
              {/* One filled wine button, then a two-column grid of outline
                  actions: same capability in roughly half the height, and the
                  accent stays singular instead of leading a stack of seven. */}
              <nav className="mt-5" aria-label="Create">
                <Button asChild className="w-full justify-start"><Link href="/plans/new"><CalendarDays className="size-4" />New plan</Link></Button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm" className="justify-start"><Link href="/memories/new"><Sparkles className="size-4" />Memory</Link></Button>
                  <Button asChild variant="outline" size="sm" className="justify-start"><Link href="/milestones/new"><CalendarHeart className="size-4" />Moment</Link></Button>
                  <Button asChild variant="outline" size="sm" className="justify-start"><Link href="/bucket/new"><ListChecks className="size-4" />Idea</Link></Button>
                  <Button asChild variant="outline" size="sm" className="justify-start"><Link href="/notes/new"><NotebookPen className="size-4" />Note</Link></Button>
                  <Button asChild variant="outline" size="sm" className="justify-start"><Link href="/drawings/new"><Brush className="size-4" />Drawing</Link></Button>
                  <Button asChild variant="outline" size="sm" className="justify-start"><Link href="/wishlist/new"><Gift className="size-4" />Wish</Link></Button>
                </div>
              </nav>
              <div className="mt-4 flex flex-wrap items-center gap-x-6">
                <InlineLink href="/gallery"><Camera className="size-4" aria-hidden="true" />Open gallery</InlineLink>
                {wishlistCount ? <InlineLink href="/wishlist"><Gift className="size-4" aria-hidden="true" />{wishlistCount} {wishlistCount === 1 ? "wish" : "wishes"}</InlineLink> : null}
              </div>
            </section>
            <section className="rounded-panel bg-secondary p-6">
              <div className="flex gap-3">
                <LockKeyhole className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl">Safe projections only.</h2>
                  {/* The promise in one sentence, the full accounting one tap
                      away. Same honesty, without a wall of text in the rail. */}
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Home only ever shows what both of you can already see.</p>
                  <details className="mt-2">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">What Home can read</summary>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Shared plans, memories, moments, bucket counts, wishes, drawings both of you can already see, and only the notes you are allowed to read. A partner private note and any gift plan are never counted, previewed, or copied into notifications.</p>
                  </details>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
