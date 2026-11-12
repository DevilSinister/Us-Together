import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { z } from "zod";
import { Avatar } from "@/components/app/avatar";
import { Cover, CoverSheet } from "@/components/app/cover";
import type { CoverImage } from "@/components/app/cover-photo";
import { CommentThread } from "@/components/entries/comment-thread";
import { MediaCollection } from "@/components/entries/media-collection";
import { loadIdentities } from "@/lib/avatar/identities";
import { momentKindLabel } from "@/lib/dashboard/moments";
import { planContext } from "@/lib/plans/data";

export const metadata = { title: "Moment" };

type Moment = { title: string; description: string | null; date: string; location: string | null; type: string; featured: boolean; keptBy: "me" | "partner" };

const longDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
const chipClass = "inline-flex min-w-0 items-center gap-1.5 rounded-control bg-secondary px-3 py-1.5 text-[0.8125rem] font-semibold text-secondary-foreground";

/**
 * One moment as a Cover screen, laid out like a memory (ADR-053): its first
 * photograph is the cover, with the date and title over it and a round way
 * back in the corner. The sheet reads who kept it, its kind and place, the
 * story, what was captured, and what you said to each other. A moment cannot
 * be edited or deleted yet, so the page ends with the conversation rather than
 * with actions it does not have.
 */
export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [c, identities] = await Promise.all([planContext(), loadIdentities()]);
  if (!c.paired) notFound();

  let item: Moment | null = null;
  let hero: CoverImage | null = null;
  if (c.kind === "preview") {
    const m = c.state.milestones.find((x) => x.id === id);
    if (m) item = { title: m.title, description: m.description || null, date: m.milestoneDate, location: m.location ?? null, type: m.type, featured: m.featured, keptBy: "me" };
  } else {
    const [{ data, error }, { data: photos }] = await Promise.all([
      c.db.from("milestones").select("title,description,milestone_date,location,type,is_featured,created_by").eq("id", id).maybeSingle(),
      // Only a finished photograph can be a cover: a half-sent file cannot be fetched.
      c.db.from("milestone_media").select("id").eq("milestone_id", id).eq("state", "ready").eq("media_type", "image").order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1),
    ]);
    if (error) throw Error("Could not open this moment.");
    if (data) {
      item = { title: data.title, description: data.description, date: data.milestone_date, location: data.location, type: data.type, featured: data.is_featured, keptBy: data.created_by === c.userId ? "me" : "partner" };
      if (photos?.[0]) hero = { id: photos[0].id, kind: "moment", entryId: id };
    }
  }
  if (!item) notFound();

  const previewSession = c.kind === "preview" ? c.state.bucketSessionId : undefined;
  const access = { kind: "moment" as const, id, previewSession };
  const keeper = item.keptBy === "me" ? identities.me : identities.partner;
  const kind = momentKindLabel(item.type);

  return (
    <>
      <Cover
        labelledBy="moment-title"
        back={{ href: "/milestones", label: "All moments" }}
        photo={hero}
        previewSession={previewSession}
        previewEntry={{ kind: "moment", id }}
      >
        <p className="text-sm text-muted-foreground">Moment · <time dateTime={item.date}>{longDate.format(new Date(`${item.date}T00:00:00Z`))}</time></p>
        <h1 id="moment-title" className="mt-1 max-w-[20ch] text-balance break-words font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em] lg:text-5xl">{item.title}</h1>
      </Cover>

      <CoverSheet className="max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <p className="flex min-w-0 items-center gap-2.5 text-sm text-muted-foreground">
            <Avatar name={keeper.name} src={keeper.src} style={keeper.style} size="sm" />
            <span className="truncate">Kept by {item.keptBy === "me" ? "you" : keeper.name}</span>
          </p>
          {item.featured ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
              <Star className="size-4 fill-current" aria-hidden="true" />Featured
            </span>
          ) : null}
        </div>

        {kind || item.location ? (
          <ul aria-label="Kind and place" className="stagger mt-4 flex flex-wrap gap-2">
            {kind ? <li className={chipClass}>{kind}</li> : null}
            {item.location ? (
              <li className={chipClass}>
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="break-words"><span className="sr-only">Place: </span>{item.location}</span>
              </li>
            ) : null}
          </ul>
        ) : null}

        {item.description ? (
          <section aria-labelledby="moment-story" className="mt-5">
            <h2 id="moment-story" className="sr-only">The story</h2>
            <p className="whitespace-pre-wrap break-words text-lg leading-8">{item.description}</p>
          </section>
        ) : null}

        <MediaCollection access={access} entryTitle={item.title} entryDate={item.date} separated leadTile={!hero} />

        <CommentThread access={access} timezone={c.timezone} />
      </CoverSheet>
    </>
  );
}
