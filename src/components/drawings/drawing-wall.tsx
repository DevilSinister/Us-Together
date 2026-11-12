import Link from "next/link";
import { Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DrawingNote } from "@/lib/drawings/data";
import { absoluteTime, relativeTime } from "@/lib/time/relative";

const imageOf = (id: string) => "/api/drawing-notes/" + id + "/image";

function When({ iso, timeZone, className }: { iso: string | null; timeZone: string; className?: string }) {
  if (!iso) return null;
  return <time dateTime={iso} title={absoluteTime(iso, timeZone)} className={className}>{relativeTime(iso, undefined, timeZone)}</time>;
}

/**
 * The drawings you have sent each other. When the newest one is your
 * partner's, it leads as the next step: the drawing, who sent it and when,
 * and Draw back. Beneath, every drawing sits on a small mat with who drew it
 * and when; one you have not opened yet carries "New".
 */
export function DrawingWall({ notes, partner, timeZone, newest }: {
  notes: DrawingNote[];
  /** The partner's name, or a phrase standing in for it. */
  partner: string;
  timeZone: string;
  /** True on the first page, where the first drawing is the newest of all. */
  newest: boolean;
}) {
  const latest = newest && notes[0] && !notes[0].mine ? notes[0] : null;

  return (
    <>
      {latest ? (
        <div className="mb-5 flex max-w-xl items-center gap-3.5 rounded-panel bg-secondary p-3.5 text-secondary-foreground">
          <Link
            href={"/drawings/" + latest.id}
            className="group flex min-w-0 flex-1 items-center gap-3.5 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageOf(latest.id)} alt={"The drawing " + partner + " sent"} className="size-16 shrink-0 rounded-control bg-white object-cover" />
            <span className="min-w-0">
              <span className="block text-[0.8125rem] font-semibold leading-5 text-primary first-letter:uppercase">{partner} sent a drawing</span>
              <When iso={latest.sent_at} timeZone={timeZone} className="block text-sm first-letter:uppercase dark:text-muted-foreground" />
            </span>
          </Link>
          <Button asChild className="shrink-0 px-3.5">
            <Link href="/drawings/new"><Brush className="size-4" aria-hidden="true" />Draw back</Link>
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="drawings-all">
        <h2 id="drawings-all" className="font-display text-section-title">Back and forth</h2>
        <ul className="stagger mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {notes.map((note, index) => (
            <li key={note.id}>
              <Link
                href={"/drawings/" + note.id}
                className="group flex flex-col gap-2 rounded-panel bg-secondary p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-card"
              >
                <span className="block overflow-hidden rounded-control bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageOf(note.id)}
                    alt={"Drawing " + (note.mine ? "you sent" : "from " + partner)}
                    loading={index < 6 ? "eager" : "lazy"}
                    className="aspect-[4/3] w-full object-contain transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                </span>
                {/* On the light blush mat the muted ink falls just short of 4.5:1, so the caption takes the mat's own ink there. */}
                <span className="flex items-center justify-between gap-2 px-0.5 text-[0.8125rem] leading-5 text-secondary-foreground dark:text-muted-foreground">
                  <span className="min-w-0 truncate first-letter:uppercase">
                    {note.mine ? "You" : partner}
                    {note.sent_at ? " · " : null}
                    <When iso={note.sent_at} timeZone={timeZone} />
                  </span>
                  {!note.read ? <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-bold leading-4 text-primary-foreground">New</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
