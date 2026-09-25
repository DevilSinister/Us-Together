import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarHeart, CheckCircle2, Images, ListChecks, MapPin, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarPair } from "@/components/app/avatar";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { ThreadMarker } from "@/components/app/thread";
import { StoryPrints } from "@/components/story/story-prints";
import { loadIdentities } from "@/lib/avatar/identities";
import { cursorFromParam, loadStory } from "@/lib/story/data";
import { chapterLabel, encodeCursor, groupByYear, storySummary, type StoryItem, type StoryKind } from "@/lib/story/schema";

export const metadata: Metadata = { title: "Our Story" };

const kinds: Record<StoryKind, { label: string; icon: typeof Images; href: (id: string) => string }> = {
  milestone: { label: "Moment", icon: CalendarHeart, href: (id) => `/milestones/${id}` },
  memory: { label: "Memory", icon: Images, href: (id) => `/memories/${id}` },
  plan: { label: "Plan kept", icon: CheckCircle2, href: (id) => `/plans/${id}` },
  bucket: { label: "Dream lived", icon: ListChecks, href: (id) => `/bucket/${id}` },
};

// Dates are stored as calendar dates, so they are formatted at UTC: shifting them
// into a viewer's zone would move an anniversary to the wrong day.
const dayFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long" });
const longFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", dateStyle: "long" });
const at = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * Says where an entry came from when the record already knows. The chain is the
 * point of the timeline: a memory that started as a saved idea is the product loop
 * closing, and until now nothing in the interface showed it.
 */
function provenance(entry: StoryItem) {
  if (entry.source_bucket_item_id) return { label: "This began as an idea you saved", href: `/bucket/${entry.source_bucket_item_id}` };
  if (entry.source_plan_id) return { label: "Kept from a plan you made", href: `/plans/${entry.source_plan_id}` };
  return null;
}

/**
 * Our Story, told as an album rather than a log.
 *
 * It opens on the two of you - faces and names as you chose them - with the
 * day it began and what you have kept since, in a sentence. Each calendar year
 * is a chapter, counted from that first year. Memories and moments lead with
 * their own photographs as a small stack of prints, the opening of their story
 * and which of you kept it; plans kept and dreams lived are quieter lines on
 * the same thread. The story ends where it began, on the day itself.
 */
export default async function StoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const cursor = cursorFromParam(params.after);
  const [view, identities] = await Promise.all([loadStory(cursor), loadIdentities()]);
  const groups = groupByYear(view.entries);
  const startedOn = view.overview?.startedOn ?? null;
  const summary = view.overview ? storySummary(view.overview.counts) : null;
  const names = `${identities.me.name} & ${identities.partner.name}`;

  const lede = cursor
    ? "Earlier chapters, still newest first."
    : [startedOn ? `It began on ${longFormat.format(at(startedOn))}.` : null, summary ? `So far: ${summary}.` : null].filter(Boolean).join(" ")
      || "Moments, memories, the plans you kept and the dreams you finished, on one thread.";

  // Kept entries alternate the way their prints lean, across chapter breaks.
  let leaning = 0;

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow={view.paired
          ? <span className="inline-flex items-center gap-2.5"><AvatarPair me={identities.me} partner={identities.partner} size="sm" /><span className="min-w-0 truncate">{names}</span></span>
          : "Everything you have kept"}
        title={cursor ? "Earlier in our story." : "Our story, so far."}
        lede={lede}
        actions={view.paired ? <InlineLink href="/gallery">Open gallery <ArrowRight className="size-4" aria-hidden="true" /></InlineLink> : null}
      />

      {view.error ? <p role="alert" className="status-message status-error mt-8">{view.error}</p> : null}

      {!view.paired && !view.error ? (
        <PairingNotice
          title="Your story opens with your shared space."
          body="A timeline is built from what the two of you keep together, so it waits until both accounts are connected."
        />
      ) : null}

      {view.paired ? (
        view.entries.length ? (
          <div className="max-w-3xl">
            {groups.map((group) => {
              const chapter = chapterLabel(group.year, startedOn);
              let month = "";
              return (
                <section key={group.year} className="mt-12 first:mt-10" aria-labelledby={`year-${group.year}`}>
                  <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-3">
                    <h2 id={`year-${group.year}`} className="font-display text-6xl leading-none tracking-[-0.03em] text-primary sm:text-7xl">{group.year}</h2>
                    {chapter ? <p className="font-display text-xl italic text-muted-foreground">{chapter}</p> : null}
                  </header>

                  <ol className="relationship-thread mt-4">
                    {group.entries.map((entry) => {
                      const kind = kinds[entry.kind];
                      const source = provenance(entry);
                      const thisMonth = monthFormat.format(at(entry.occurred_on));
                      const newMonth = thisMonth !== month;
                      month = thisMonth;
                      const kept = entry.kind === "memory" || entry.kind === "milestone";
                      const lean: 1 | -1 = kept && leaning++ % 2 === 1 ? -1 : 1;
                      const author = entry.author === "me" ? identities.me : entry.author === "partner" ? identities.partner : null;
                      return (
                        <li key={`${entry.kind}-${entry.id}`} className="relative flex gap-5 py-5">
                          <ThreadMarker icon={kind.icon} muted={!kept} />
                          <div className="min-w-0 flex-1">
                            {newMonth ? <p className="mb-1 font-display text-lg italic leading-tight text-muted-foreground">{thisMonth}</p> : null}
                            <p className="text-sm font-semibold text-primary">
                              {kind.label} · <time dateTime={entry.occurred_on}>{dayFormat.format(at(entry.occurred_on))}</time>
                            </p>

                            <Link
                              href={kind.href(entry.id)}
                              className="group mt-1 block rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                            >
                              {kept ? (
                                <StoryPrints
                                  kind={entry.kind === "memory" ? "memory" : "moment"}
                                  entryId={entry.id}
                                  ids={entry.photos}
                                  previewSession={view.previewSession}
                                  title={entry.title}
                                  lean={lean}
                                />
                              ) : null}
                              <h3 className={
                                kept
                                  ? "mt-1 break-words font-display text-3xl leading-tight transition-colors group-hover:text-primary motion-reduce:transition-none"
                                  : "break-words font-display text-2xl leading-tight transition-colors group-hover:text-primary motion-reduce:transition-none"
                              }>
                                {entry.title}
                              </h3>
                            </Link>

                            {entry.excerpt ? <p className="mt-2 line-clamp-3 max-w-[62ch] text-pretty leading-7 text-muted-foreground">{entry.excerpt}</p> : null}

                            {author || entry.location ? (
                              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                {author ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Avatar name={author.name} src={author.src} style={author.style} size="xs" />
                                    Kept by {entry.author === "me" ? "you" : author.name}
                                  </span>
                                ) : null}
                                {entry.location ? (
                                  <span className="inline-flex min-w-0 items-center gap-1.5">
                                    <MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{entry.location}</span>
                                  </span>
                                ) : null}
                              </p>
                            ) : null}

                            {source ? (
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {source.label} · <InlineLink href={source.href}>See where it started</InlineLink>
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}

            {view.next ? (
              <div className="mt-10 border-t pt-8">
                <Button asChild variant="outline">
                  <Link href={`/story?after=${encodeURIComponent(encodeCursor(view.next))}`}>Earlier chapters</Link>
                </Button>
              </div>
            ) : (
              <StoryBeginning startedOn={startedOn} identities={identities} fromTop={!cursor} />
            )}
          </div>
        ) : cursor ? (
          <EmptyState
            icon={ScrollText}
            title="Nothing earlier than this."
            body="You have reached the start of what you have kept together."
            action={<Button asChild variant="outline"><Link href="/story">Back to the beginning of the page</Link></Button>}
          />
        ) : (
          <EmptyState
            icon={ScrollText}
            title="Your story starts with one kept thing."
            body="Mark a moment, save a memory, or finish something from your bucket list, and it will appear here in order."
            action={
              <>
                <Button asChild><Link href="/milestones/new">Add a moment</Link></Button>
                <Button asChild variant="outline"><Link href="/memories/new">Add a memory</Link></Button>
              </>
            }
          />
        )
      ) : null}
    </div>
  );
}

/** The last page ends where the story began: the two of you, and the day itself. */
function StoryBeginning({ startedOn, identities, fromTop }: { startedOn: string | null; identities: Awaited<ReturnType<typeof loadIdentities>>; fromTop: boolean }) {
  return (
    <section aria-label="Where it began" className="mt-14 border-t pt-12 text-center">
      {startedOn ? (
        <>
          <AvatarPair me={identities.me} partner={identities.partner} size="lg" />
          <p className="mt-5 text-sm font-semibold text-primary">Where it began</p>
          <p className="mt-2 font-display text-4xl leading-tight sm:text-5xl"><time dateTime={startedOn}>{longFormat.format(at(startedOn))}</time></p>
          <p className="mx-auto mt-3 max-w-[46ch] text-pretty leading-7 text-muted-foreground">The first page. Everything above grew from here.</p>
        </>
      ) : (
        <p className="leading-7 text-muted-foreground">{fromTop ? "That is everything, for now." : "That is the beginning of your story so far."}</p>
      )}
      <p className="mx-auto mt-8 max-w-[52ch] text-xs leading-5 text-muted-foreground">Private notes and wishlists are never part of this timeline.</p>
    </section>
  );
}
