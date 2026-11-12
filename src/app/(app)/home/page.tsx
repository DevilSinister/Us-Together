import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brush, CalendarPlus, ChevronRight, Flag, Gift, LockKeyhole, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { Avatar, AvatarPair } from "@/components/app/avatar";
import { RecentPhotos } from "@/components/home/home-photos";
import { Cover, CoverSheet } from "@/components/app/cover";
import type { CoverImage, PreviewEntry } from "@/components/app/cover-photo";
import { CreateTrigger, HomeCreateProvider } from "@/components/home/home-create";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { loadIdentities } from "@/lib/avatar/identities";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { bucketPreview } from "@/lib/bucket/preview";
import { datePlate, daysUntil, planLead, relationshipDayCount } from "@/lib/dashboard/model";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

type PlanRow = { id: string; title: string; starts_at: string; location: string | null };
type MemoryRow = { id: string; title: string; memory_date: string };
type MilestoneRow = { id: string; title: string; milestone_date: string; is_featured: boolean };
type NoteRow = { id: string; title: string; type: string; mine: boolean };
type DrawingRow = { id: string; mine: boolean; sent_at: string | null };

/**
 * Home is a cover and a sheet. The cover is the newest memory's photograph with
 * the day count laid over it; the sheet beneath holds the next plan and one
 * quiet row for each thing worth returning to. Every create action waits behind
 * a single button.
 *
 * Privacy rests on the database: row level security decides which notes and
 * drawings arrive, and the section-lock policies hide memory and moment media
 * whenever Gallery, Memories or Moments is locked, so a locked section simply
 * contributes no photographs here.
 */
export default async function HomePage() {
  const [identity, identities] = await Promise.all([getCurrentIdentity(), loadIdentities()]);
  const partnerLabel = identities.partner.name;
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
  let recentNote: NoteRow | null = null;
  let recentDrawing: DrawingRow | null = null;
  let wishlistCount = 0;
  let coverPhoto: CoverImage | null = null;
  let recentPhotos: CoverImage[] = [];
  let previewSession: string | undefined;
  let previewEntries: PreviewEntry[] = [];

  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    name = state.displayName || null;
    timezone = state.timezone;
    onboardingCompleted = state.onboardingCompleted;
    coupleStatus = state.coupleStatus;
    relationshipStartedOn = state.relationshipStartedOn;
    previewSession = state.bucketSessionId;
    const plan = state.plans
      .filter((item) => item.status === "planned" && item.startsAt >= new Date().toISOString())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    upcomingPlan = plan ? { id: plan.id, title: plan.title, starts_at: plan.startsAt, location: plan.location || null } : null;
    const memories = [...state.memories].sort((a, b) => b.memoryDate.localeCompare(a.memoryDate) || b.id.localeCompare(a.id));
    const memory = memories[0];
    recentMemory = memory ? { id: memory.id, title: memory.title, memory_date: memory.memoryDate } : null;
    const milestones = [...state.milestones].sort((a, b) => b.milestoneDate.localeCompare(a.milestoneDate) || b.id.localeCompare(a.id));
    const milestone = [...milestones].sort((a, b) => Number(b.featured) - Number(a.featured))[0];
    featuredMilestone = milestone ? { id: milestone.id, title: milestone.title, milestone_date: milestone.milestoneDate, is_featured: milestone.featured } : null;
    previewEntries = [
      ...memories.slice(0, 2).map((item) => ({ kind: "memory" as const, id: item.id })),
      ...milestones.slice(0, 2).map((item) => ({ kind: "moment" as const, id: item.id })),
    ];
    const bucket = await bucketPreview(state.bucketSessionId);
    bucketTotal = bucket.items.length;
    bucketCompleted = bucket.items.filter((item) => item.status === "completed").length;
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
        const [{ data: couple }, { data: plans }, { data: memories }, { data: milestones }, { count: totalIdeas }, { count: completedIdeas }, { data: noteRows }, { count: wishCount }, { data: drawingRows }, { data: memoryMedia }, { data: momentMedia }] = await Promise.all([
          supabase.from("couples").select("relationship_started_on").eq("id", membership.couple_id).maybeSingle(),
          supabase.from("plans").select("id,title,starts_at,location").eq("couple_id", membership.couple_id).eq("status", "planned").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(1),
          supabase.from("memories").select("id,title,memory_date").eq("couple_id", membership.couple_id).order("memory_date", { ascending: false }).order("id", { ascending: false }).limit(1),
          supabase.from("milestones").select("id,title,milestone_date,is_featured").eq("couple_id", membership.couple_id).order("is_featured", { ascending: false }).order("milestone_date", { ascending: false }).order("id", { ascending: false }).limit(1),
          supabase.from("bucket_list_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id),
          supabase.from("bucket_list_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).eq("status", "completed"),
          // Row level security decides which notes are visible; a partner private note never arrives.
          supabase.from("notes").select("id,title,type,author_id").eq("couple_id", membership.couple_id).order("updated_at", { ascending: false }).limit(1),
          supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id),
          // Only ready drawings are visible to both partners; the image route re-authorizes on read.
          supabase.from("drawing_notes").select("id,author_id,sent_at").eq("couple_id", membership.couple_id).eq("status", "ready").order("sent_at", { ascending: false }).order("id", { ascending: false }).limit(1),
          // Only finished photographs: a partner's half-sent file is never ready, so never shown.
          supabase.from("memory_media").select("id,memory_id,created_at").eq("state", "ready").eq("media_type", "image").order("created_at", { ascending: false }).limit(4),
          supabase.from("milestone_media").select("id,milestone_id,created_at").eq("state", "ready").eq("media_type", "image").order("created_at", { ascending: false }).limit(4),
        ]);
        relationshipStartedOn = couple?.relationship_started_on ?? relationshipStartedOn;
        upcomingPlan = (plans?.[0] ?? null) as PlanRow | null;
        recentMemory = (memories?.[0] ?? null) as MemoryRow | null;
        featuredMilestone = (milestones?.[0] ?? null) as MilestoneRow | null;
        bucketTotal = totalIdeas ?? 0;
        bucketCompleted = completedIdeas ?? 0;
        const note = noteRows?.[0];
        recentNote = note ? { id: note.id, title: note.title, type: note.type, mine: note.author_id === identity.userId } : null;
        const drawing = drawingRows?.[0];
        recentDrawing = drawing ? { id: drawing.id, mine: drawing.author_id === identity.userId, sent_at: drawing.sent_at } : null;
        wishlistCount = wishCount ?? 0;
        recentPhotos = [
          ...(memoryMedia ?? []).map((row) => ({ id: row.id, kind: "memory" as const, entryId: row.memory_id, at: row.created_at })),
          ...(momentMedia ?? []).map((row) => ({ id: row.id, kind: "moment" as const, entryId: row.milestone_id, at: row.created_at })),
        ]
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 4)
          .map(({ id, kind, entryId }) => ({ id, kind, entryId }));
        if (recentMemory) {
          // The cover is the newest memory's own first photograph, so the line
          // under the title always names what is pictured.
          const { data: hero } = await supabase.from("memory_media").select("id").eq("memory_id", recentMemory.id).eq("state", "ready").eq("media_type", "image").order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1);
          coverPhoto = hero?.[0] ? { id: hero[0].id, kind: "memory", entryId: recentMemory.id } : null;
        }
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

  const paired = coupleStatus === "paired";
  const dayCount = relationshipStartedOn ? relationshipDayCount(relationshipStartedOn, timezone) : null;
  // Memory and moment dates are calendar days, not instants: read them in UTC so
  // nobody west of Greenwich sees the day before.
  const longDate = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  const shortDate = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "short", day: "numeric" });
  const planWhen = new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "short", hour: "numeric", minute: "2-digit" });
  const greeting = name ? `Good to see you, ${name}` : "Welcome back";

  return (
    // No entrance animation on this wrapper: its clip-path would cut off the
    // cover's bleed, and its transform would trap the fixed create button.
    <HomeCreateProvider>
      <Cover height="tall" labelledBy="home-title" photo={coverPhoto} previewSession={previewSession} previewEntry={recentMemory ? { kind: "memory", id: recentMemory.id } : null}>
          {dayCount === null ? (
            <h1 id="home-title" className="max-w-[18ch] text-balance font-display text-[2.25rem] leading-[1.1] tracking-[-0.02em]">
              Your shared story has room for its first date.
            </h1>
          ) : (
            <h1 id="home-title" aria-label={`${dayCount.toLocaleString("en")} days of us—and counting`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[4.5rem] leading-[0.9] tracking-[-0.03em] lg:text-[5.5rem]">{dayCount.toLocaleString("en")}</span>
              <span className="text-base">days of us, and counting</span>
            </h1>
          )}
          {paired && recentMemory ? (
            <Link
              href={`/memories/${recentMemory.id}`}
              className="mt-1 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-control text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="truncate">Recently kept · {recentMemory.title} · {shortDate.format(new Date(`${recentMemory.memory_date}T00:00:00Z`))}</span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}
      </Cover>

      <CoverSheet className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <p className="flex min-w-0 items-center gap-2.5 text-sm text-muted-foreground">
              {paired
                ? <AvatarPair me={identities.me} partner={identities.partner} size="sm" />
                : <Avatar name={identities.me.name} src={identities.me.src} style={identities.me.style} size="sm" />}
              <span className="truncate">{greeting}</span>
            </p>
            {paired ? <CreateTrigger variant="inline" /> : null}
          </div>

          {!paired ? (
            <PairingNotice
              className="mt-6"
              title={coupleStatus === "waiting" ? "Your invitation is waiting for its person." : "Bring your partner into this private space."}
              body="Home fills in once two accounts share this space: your plans, what you keep, and the dates between you."
              cta="View connection"
            />
          ) : (
            <>
              <section aria-labelledby="home-next" className="mt-5">
                {upcomingPlan ? (
                  <NextPlan plan={upcomingPlan} lead={planLead(daysUntil(upcomingPlan.starts_at, timezone))} plate={datePlate(upcomingPlan.starts_at, timezone)} when={planWhen.format(new Date(upcomingPlan.starts_at))} />
                ) : (
                  <div className="rounded-panel bg-secondary p-5 text-secondary-foreground">
                    <p className="text-sm font-semibold text-primary">Nothing planned yet</p>
                    <h2 id="home-next" className="mt-1 text-entry-title">Give yourselves one thing to look forward to.</h2>
                    <Button asChild className="mt-4"><Link href="/plans/new"><CalendarPlus className="size-4" aria-hidden="true" />Make a plan</Link></Button>
                  </div>
                )}
              </section>

              <section aria-labelledby="home-lately" className="mt-4">
                <h2 id="home-lately" className="sr-only">Lately</h2>
                <ul className="stagger divide-y divide-border">
                  {featuredMilestone ? (
                    <Row
                      href={`/milestones/${featuredMilestone.id}`}
                      lead={<Mark><Flag className="size-5" /></Mark>}
                      kicker={`${featuredMilestone.is_featured ? "Featured moment" : "Latest moment"} · ${longDate.format(new Date(`${featuredMilestone.milestone_date}T00:00:00Z`))}`}
                      title={featuredMilestone.title}
                    />
                  ) : (
                    <Row href="/milestones/new" lead={<Mark><Plus className="size-5" /></Mark>} kicker="Moments" title="Mark the date that began a chapter." />
                  )}

                  {recentNote ? (
                    <Row
                      href={`/notes/${recentNote.id}`}
                      lead={recentNote.mine || recentNote.type === "private"
                        ? <Avatar name={identities.me.name} src={identities.me.src} style={identities.me.style} className="size-11" />
                        : <Avatar name={identities.partner.name} src={identities.partner.src} style={identities.partner.style} className="size-11" />}
                      kicker={recentNote.type === "private" ? "Your private note" : recentNote.mine ? "You shared a note" : `${partnerLabel} left a note`}
                      title={recentNote.title}
                    />
                  ) : null}

                  {recentDrawing ? (
                    <li className="flex items-center gap-3 py-3">
                      <Link href={`/drawings/${recentDrawing.id}`} className="group flex min-w-0 flex-1 items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-control border bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/drawing-notes/${recentDrawing.id}/image`} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                        </span>
                        <RowText kicker={recentDrawing.mine ? "You sent a drawing" : `${partnerLabel} sent a drawing`} title="Drawn by hand" />
                      </Link>
                      <Button asChild variant="outline" size="sm" className="shrink-0 px-3">
                        <Link href="/drawings/new"><Brush className="size-4 text-primary" aria-hidden="true" />{recentDrawing.mine ? "Draw another" : "Draw back"}</Link>
                      </Button>
                    </li>
                  ) : null}

                  {bucketTotal ? (
                    <Row
                      href="/bucket"
                      lead={<ProgressRing done={bucketCompleted} total={bucketTotal} />}
                      kicker="Bucket lists"
                      title={`${bucketCompleted} of ${bucketTotal} ${bucketTotal === 1 ? "dream" : "dreams"} lived`}
                    />
                  ) : null}

                  {wishlistCount ? (
                    <Row
                      href="/wishlist"
                      lead={<Mark><Gift className="size-5" /></Mark>}
                      kicker="Wishlists"
                      title={`${wishlistCount} ${wishlistCount === 1 ? "wish" : "wishes"} saved`}
                    />
                  ) : null}
                </ul>
              </section>
            </>
          )}
        </div>

        {paired ? (
          <aside className="mt-8 space-y-6 lg:mt-0">
            <section aria-labelledby="home-gallery" className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="home-gallery" className="font-display text-section-title">Gallery</h2>
                <Link href="/gallery" className="inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Open gallery</Link>
              </div>
              <RecentPhotos hosted={recentPhotos} previewSession={previewSession} previewEntries={previewEntries} />
            </section>

            <div className="flex gap-3 border-t pt-5 text-sm leading-6 text-muted-foreground">
              <LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p>Home only shows what you can both already see.</p>
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">What Home can read</summary>
                  <p className="pb-2">Shared plans, memories, moments and their photos, bucket counts, wishes, drawings both of you can already see, and only the notes you are allowed to read. A partner’s private note and any gift plan are never counted, previewed, or copied into notifications.</p>
                </details>
              </div>
            </div>
          </aside>
        ) : null}
      </CoverSheet>

      {paired ? <CreateTrigger variant="floating" /> : null}
    </HomeCreateProvider>
  );
}

function NextPlan({ plan, lead, plate, when }: { plan: PlanRow; lead: string; plate: { month: string; day: string }; when: string }) {
  return (
    <Link
      href={`/plans/${plan.id}`}
      className="group flex items-center gap-4 rounded-panel bg-secondary p-4 text-secondary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-control bg-background text-primary">
        <span className="text-[0.6875rem] font-bold leading-tight tracking-[0.06em]">{plate.month}</span>
        <span className="font-display text-[1.75rem] leading-none text-foreground">{plate.day}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-primary">{lead}</span>
        <h2 id="home-next" className="mt-0.5 text-entry-title">{plan.title}</h2>
        <span className="mt-0.5 block text-sm text-muted-foreground">{plan.location ? `${when} · ${plan.location}` : when}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
    </Link>
  );
}

function Row({ href, lead, kicker, title }: { href: string; lead: React.ReactNode; kicker: string; title: string }) {
  return (
    <li>
      <Link href={href} className="group flex min-h-[4.25rem] items-center gap-3 rounded-control py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {lead}
        <RowText kicker={kicker} title={title} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </Link>
    </li>
  );
}

function RowText({ kicker, title }: { kicker: string; title: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[0.8125rem] leading-5 text-muted-foreground">{kicker}</span>
      <h3 className="break-words text-[1.0625rem] font-semibold leading-snug transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">{title}</h3>
    </span>
  );
}

function Mark({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span aria-hidden="true" className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground", className)}>{children}</span>;
}

/** How much of the shared bucket has been lived, beside the sentence that says so. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const circumference = 2 * Math.PI * 18;
  const share = total ? Math.min(1, done / total) : 0;
  return (
    <svg aria-hidden="true" viewBox="0 0 44 44" className="size-11 shrink-0 -rotate-90">
      <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-secondary" />
      {share > 0 ? <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${circumference * share} ${circumference}`} className="stroke-primary" /> : null}
    </svg>
  );
}
