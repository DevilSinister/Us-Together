import Link from "next/link";
import { Lock } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import type { ResolvedIdentity } from "@/lib/avatar/resolve";
import { noteExcerpt, type Note } from "@/lib/notes/schema";
import { absoluteTime } from "@/lib/time/relative";

/**
 * The notes list as ruled rows. Each leads with who it is from: the writer's
 * face for a shared note, a lock for a page only its author can read. The
 * title comes first, a two-line excerpt under it, and a last quiet line says
 * who wrote it and when. A partner's note not yet opened carries "New".
 */
export function NoteRows({ notes, me, partner, timeZone }: {
  notes: Note[];
  me: ResolvedIdentity;
  partner: ResolvedIdentity;
  timeZone: string;
}) {
  const day = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone });
  const dayWithYear = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone });
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone });
  const thisYear = year.format(new Date());

  return (
    <ul className="stagger divide-y divide-border">
      {notes.map((note) => {
        const shared = note.type === "shared";
        const author = note.mine ? me : partner;
        const written = new Date(note.updated_at);
        const excerpt = noteExcerpt(note.body);
        return (
          <li key={note.id}>
            <Link
              href={"/notes/" + note.id}
              className="group flex min-h-[4.25rem] items-start gap-3 rounded-control py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {shared ? (
                <Avatar name={author.name} src={author.src} style={author.style} className="size-11" />
              ) : (
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
                  <Lock className="size-5" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">
                    {note.title}
                  </span>
                  {shared && !note.read ? (
                    <span className="mt-0.5 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-bold leading-4 text-primary-foreground">New</span>
                  ) : null}
                </span>
                {excerpt ? <span className="line-clamp-2 break-words text-sm leading-[1.5] text-muted-foreground">{excerpt}</span> : null}
                <span className="text-[0.8125rem] leading-5 text-muted-foreground">
                  {shared ? (note.mine ? "From you" : "From " + partner.name) : "Only you"}
                  {" · "}
                  <time dateTime={note.updated_at} title={absoluteTime(note.updated_at, timeZone)}>
                    {(year.format(written) === thisYear ? day : dayWithYear).format(written)}
                  </time>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
