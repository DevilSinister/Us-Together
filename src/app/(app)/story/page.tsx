import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarPair } from "@/components/app/avatar";
import { Cover, CoverSheet } from "@/components/app/cover";
import type { CoverImage } from "@/components/app/cover-photo";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { StoryCard, StoryRow } from "@/components/story/story-card";
import { loadIdentities } from "@/lib/avatar/identities";
import { relationshipDayCount } from "@/lib/dashboard/model";
import { cursorFromParam, loadStory } from "@/lib/story/data";
import { chapterLabel, encodeCursor, groupByYear, yearCursor, type StoryItem, type StoryKind, type StoryYear } from "@/lib/story/schema";
import { getViewerTimeZone } from "@/lib/time/viewer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Our Story" };

const hrefs: Record<StoryKind, (id: string) => string> = {
  milestone: (id) => `/milestones/${id}`,
  memory: (id) => `/memories/${id}`,
  plan: (id) => `/plans/${id}`,
  bucket: (id) => `/bucket/${id}`,
};

// Dates are stored as calendar dates, so they are formatted at UTC: shifting them
// into a viewer's zone would move an anniversary to the wrong day.
const dayFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long" });
const longFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", dateStyle: "long" });
const at = (date: string) => new Date(`${date}T00:00:00Z`);

/** Where an entry came from, when the record knows: the product loop closing, said in one line. */
function provenance(entry: StoryItem) {
  if (entry.source_bucket_item_id) return { label: "This began as an idea you saved", href: `/bucket/${entry.source_bucket_item_id}` };
  if (entry.source_plan_id) return { label: "Kept from a plan you made", href: `/plans/${entry.source_plan_id}` };
  return null;
}

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

/**
 * Our Story as a Cover screen (ADR-053). The cover is the newest photograph on
 * the page with the two of you, how many days it has been and what you have
 * kept. A row of year chapters jumps the story to a year; each year opens with
 * its number set large, its chapter and how much it holds. On the thread,
 * months are italic markers, memories and moments are small covers of their
 * own with the first lines of their story beneath, and plans kept and dreams
 * lived are quiet rows. The last page ends where it began.
 */
export default async function StoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const cursor = cursorFromParam(params.after);
  const [view, identities, timeZone] = await Promise.all([loadStory(cursor), loadIdentities(), getViewerTimeZone()]);
  const groups = groupByYear(view.entries);
  const startedOn = view.overview?.startedOn ?? null;
  const years = view.overview?.years ?? [];
  const days = startedOn ? relationshipDayCount(startedOn, timeZone) : null;
  const kept = view.overview?.counts.memory ?? 0;
  const thisYear = String(new Date().getUTCFullYear());

  const pictured = view.entries.find((entry) => (entry.kind === "memory" || entry.kind === "milestone") && entry.photos.length);
  const photo: CoverImage | null = pictured ? { id: pictured.photos[0], kind: pictured.kind === "memory" ? "memory" : "moment", entryId: pictured.id } : null;
  const firstKept = view.entries.find((entry) => entry.kind === "memory" || entry.kind === "milestone");
  const line = [
    `${identities.me.name} and ${identities.partner.name}`,
    days !== null ? `${days.toLocaleString("en")} ${days === 1 ? "day" : "days"}` : null,
    kept ? `${kept.toLocaleString("en")} ${kept === 1 ? "memory" : "memories"} kept` : null,
  ].filter(Boolean).join(" · ");

  const shownYear = view.entries[0]?.occurred_on.slice(0, 4) ?? null;
  const lastYear = view.entries.at(-1)?.occurred_on.slice(0, 4) ?? null;
  const older = lastYear ? years.filter((item) => item.year < lastYear).map((item) => item.year) : [];
  const keepReading = older.length
    ? "Keep reading: " + (older.length > 2 ? older.slice(0, 2).join(", ") + " and earlier" : listFormat.format(older))
    : lastYear ? `Keep reading ${lastYear}` : "Keep reading";

  return (
    <>
      <Cover
        labelledBy="story-title"
        photo={photo}
        previewSession={view.previewSession}
        previewEntry={firstKept ? { kind: firstKept.kind === "memory" ? "memory" : "moment", id: firstKept.id } : null}
      >
        {view.paired ? <AvatarPair me={identities.me} partner={identities.partner} size="xs" className="mb-2.5 [&>*]:ring-[var(--cover-field)]" /> : null}
        <h1 id="story-title" className="font-display text-5xl leading-none tracking-[-0.02em]">Our Story</h1>
        <p className="mt-2 text-[0.9375rem] text-muted-foreground">{view.paired ? line : "Everything you keep together, in order"}</p>
      </Cover>

      <CoverSheet>
        {view.error ? <p role="alert" className="status-message status-error">{view.error}</p> : null}

        {!view.paired && !view.error ? (
          <PairingNotice
            className="mt-0"
            title="Your story opens with your shared space."
            body="A timeline is built from what the two of you keep together, so it waits until both accounts are connected."
          />
        ) : null}

        {view.paired ? (
          view.entries.length ? (
            <div className="flex max-w-2xl flex-col gap-5">
              {years.length > 1 ? (
                <nav aria-label="Chapters" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                  {years.map((item, index) => {
                    const target = index === 0 ? "/story" : `/story?after=${encodeURIComponent(encodeCursor(yearCursor(item.year)!))}`;
                    const current = item.year === shownYear;
                    return (
                      <Link
                        key={item.year}
                        href={target}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "grid min-h-11 shrink-0 place-items-center rounded-control border px-4 text-[0.9375rem] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                          current ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {item.year}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}

              {groups.map((group, index) => (
                <Chapter
                  key={group.year}
                  year={group.year}
                  entries={group.entries}
                  startedOn={startedOn}
                  count={years.find((item: StoryYear) => item.year === group.year)?.count ?? null}
                  current={group.year === thisYear}
                  previewSession={view.previewSession}
                  className={index ? "pt-3" : undefined}
                />
              ))}

              {view.next ? (
                <Button asChild variant="outline" className="self-start">
                  <Link href={`/story?after=${encodeURIComponent(encodeCursor(view.next))}`}>{keepReading}</Link>
                </Button>
              ) : (
                <StoryBeginning startedOn={startedOn} identities={identities} fromTop={!cursor} />
              )}
            </div>
          ) : cursor ? (
            <EmptyState
              icon={ScrollText}
              title="Nothing earlier than this."
              body="You have reached the start of what you have kept together."
              action={<Button asChild variant="outline"><Link href="/story">Back to the newest chapter</Link></Button>}
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
      </CoverSheet>
    </>
  );
}

/** One year: its number set large with its chapter and count, then its part of the thread. */
function Chapter({ year, entries, startedOn, count, current, previewSession, className }: {
  year: string;
  entries: StoryItem[];
  startedOn: string | null;
  count: number | null;
  current: boolean;
  previewSession?: string;
  className?: string;
}) {
  const chapter = chapterLabel(year, startedOn);
  return (
    <section aria-labelledby={`year-${year}`} className={cn("flex flex-col gap-5", className)}>
      <header className="flex items-end justify-between gap-3">
        <h2 id={`year-${year}`} className="font-display text-[4.5rem] leading-[0.9] tracking-[-0.03em]">{year}</h2>
        {chapter || count !== null ? (
          <p className="pb-1.5 text-right text-[0.8125rem] leading-5 text-muted-foreground">
            {chapter}{chapter && count !== null ? <br /> : null}
            {count !== null ? `${count.toLocaleString("en")} kept${current ? " so far" : ""}` : null}
          </p>
        ) : null}
      </header>

      <ol className="relative flex flex-col gap-3.5 pl-7 before:absolute before:bottom-2.5 before:left-[7px] before:top-3.5 before:w-px before:bg-border">
        {entries.map((entry, index) => {
          const thisMonth = monthFormat.format(at(entry.occurred_on));
          const newMonth = index === 0 || monthFormat.format(at(entries[index - 1].occurred_on)) !== thisMonth;
          const day = dayFormat.format(at(entry.occurred_on));
          const source = provenance(entry);
          const href = hrefs[entry.kind](entry.id);
          return (
            <li key={`${entry.kind}-${entry.id}`} className="flex flex-col gap-2">
              {newMonth ? (
                <p className="relative pt-2 font-display text-[1.0625rem] italic text-muted-foreground before:absolute before:-left-[25px] before:bottom-[7px] before:size-[9px] before:rounded-full before:border before:border-primary before:bg-background">
                  {thisMonth}
                </p>
              ) : null}
              {entry.kind === "memory" || entry.kind === "milestone" ? (
                <StoryCard
                  kind={entry.kind === "memory" ? "memory" : "moment"}
                  entryId={entry.id}
                  ids={entry.photos}
                  previewSession={previewSession}
                  href={href}
                  title={entry.title}
                  date={day}
                />
              ) : (
                <StoryRow href={href} title={entry.title} kicker={`${day} · ${entry.kind === "plan" ? "a plan kept" : "a dream lived"}`} />
              )}
              {entry.excerpt ? <p className="line-clamp-3 text-sm leading-[1.5] text-muted-foreground">{entry.excerpt}</p> : null}
              {source ? (
                <Link href={source.href} className="self-start text-[0.8125rem] leading-5 text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  {source.label}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The last page ends where the story began: the two of you, and the day itself. */
function StoryBeginning({ startedOn, identities, fromTop }: { startedOn: string | null; identities: Awaited<ReturnType<typeof loadIdentities>>; fromTop: boolean }) {
  return (
    <section aria-label="Where it began" className="mt-3 flex flex-col items-center gap-1.5 border-t border-border pt-7 text-center">
      {startedOn ? (
        <>
          <AvatarPair me={identities.me} partner={identities.partner} size="lg" className="mb-1.5" />
          <p className="font-display text-2xl italic">Where it began</p>
          <p className="text-[0.8125rem] text-muted-foreground"><time dateTime={startedOn}>{longFormat.format(at(startedOn))}</time></p>
        </>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">{fromTop ? "That is everything, for now." : "That is the beginning of your story so far."}</p>
      )}
      <p className="mt-5 max-w-[46ch] text-xs leading-5 text-muted-foreground">Private notes and wishlists are never part of this timeline.</p>
    </section>
  );
}
