import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarHeart, CheckCircle2, Images, ListChecks, MapPin, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { ThreadMarker } from "@/components/app/thread";
import { cursorFromParam, loadStory } from "@/lib/story/data";
import { encodeCursor, groupByYear, type StoryEntry, type StoryKind } from "@/lib/story/schema";

export const metadata: Metadata = { title: "Our Story" };

const kinds: Record<StoryKind, { label: string; icon: typeof Images; href: (id: string) => string }> = {
  milestone: { label: "Moment", icon: CalendarHeart, href: (id) => `/milestones/${id}` },
  memory: { label: "Memory", icon: Images, href: (id) => `/memories/${id}` },
  plan: { label: "Plan", icon: CheckCircle2, href: (id) => `/plans/${id}` },
  bucket: { label: "Dream completed", icon: ListChecks, href: (id) => `/bucket/${id}` },
};

/**
 * Says where an entry came from when the record already knows. The chain is the
 * point of the timeline: a memory that started as a saved idea is the product loop
 * closing, and until now nothing in the interface showed it.
 */
function provenance(entry: StoryEntry) {
  if (entry.source_bucket_item_id) return { label: "This began as an idea you saved", href: `/bucket/${entry.source_bucket_item_id}` };
  if (entry.source_plan_id) return { label: "Kept from a plan you made", href: `/plans/${entry.source_plan_id}` };
  return null;
}

export default async function StoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const cursor = cursorFromParam(params.after);
  const view = await loadStory(cursor);
  // Dates are stored as calendar dates, so they are formatted at UTC: shifting them
  // into a viewer's zone would move an anniversary to the wrong day.
  const formatter = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", day: "numeric" });
  const groups = groupByYear(view.entries);

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="Everything you have kept"
        title="Our story, in order."
        lede="Moments, memories, the plans you actually kept, and the dreams you finished — one thread, newest first."
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
          <>
            <p className="mt-10 text-sm text-muted-foreground">
              Private notes and wishlists are never part of this timeline.
            </p>
            {groups.map((group) => (
              <section key={group.year} className="mt-10" aria-labelledby={`year-${group.year}`}>
                <h2 id={`year-${group.year}`} className="font-display text-4xl">{group.year}</h2>
                <div className="relationship-thread mt-5 space-y-1">
                  {group.entries.map((entry) => {
                    const kind = kinds[entry.kind];
                    const source = provenance(entry);
                    return (
                      <article key={`${entry.kind}-${entry.id}`} className="relative flex gap-5 py-5">
                        <ThreadMarker icon={kind.icon} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary">
                            {kind.label} · {formatter.format(new Date(`${entry.occurred_on}T00:00:00Z`))}
                          </p>
                          <h3 className="mt-1 break-words font-display text-3xl">{entry.title}</h3>
                          {entry.location ? (
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="size-4 shrink-0" aria-hidden="true" />{entry.location}
                            </p>
                          ) : null}
                          {source ? (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {source.label} · <InlineLink href={source.href}>See where it started</InlineLink>
                            </p>
                          ) : null}
                          <InlineLink href={kind.href(entry.id)} className="mt-3">
                            Open {kind.label.toLowerCase()} <ArrowRight className="size-4" aria-hidden="true" />
                          </InlineLink>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            {view.next ? (
              <div className="mt-10 border-t pt-8">
                <Button asChild variant="outline">
                  <Link href={`/story?after=${encodeURIComponent(encodeCursor(view.next))}`}>Show earlier entries</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-10 border-t pt-8 text-sm text-muted-foreground">
                {cursor ? "That is the beginning of your story so far." : "That is everything, for now."}
              </p>
            )}
          </>
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
