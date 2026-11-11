import Link from "next/link";
import { Brush, Lock, PenLine, Pencil } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { Cover, CoverSheet } from "@/components/app/cover";
import { EntryActions } from "@/components/app/entry-actions";
import { Button } from "@/components/ui/button";
import { DeleteNote } from "@/components/notes/delete-note";
import type { ResolvedIdentity } from "@/lib/avatar/resolve";
import type { Note } from "@/lib/notes/schema";
import { absoluteTime, relativeTime } from "@/lib/time/relative";

/**
 * One note as a Cover screen. The band names what it is and when, with the
 * title under it and a round way back in the corner. A shared note then reads
 * as a letter: who it is from and to, the words on the one-pixel note thread
 * exactly as typed, and the writer's name signed beneath. A private note is a
 * page of your own: a lock where the face would be, "Only you", and no
 * signature. The person a letter was written to can write back; its writer can
 * edit or delete it at the foot.
 */
export function NoteView({ note, me, partner, timeZone }: {
  note: Note;
  me: ResolvedIdentity;
  partner: ResolvedIdentity;
  timeZone: string;
}) {
  const shared = note.type === "shared";
  const author = note.mine ? me : partner;
  const written = new Date(note.updated_at);
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone });
  const sameYear = year.format(written) === year.format(new Date());
  const day = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: sameYear ? undefined : "numeric", timeZone }).format(written);
  // "You" is the fallback name for somebody who has not set one; it is not a signature.
  const signature = shared && author.name !== "You" ? author.name : null;

  return (
    <>
      <Cover labelledBy="note-title" height="band" back={{ href: "/notes", label: "Back to notes" }}>
        <p className="text-[0.8125rem] font-semibold text-primary">
          {shared ? "Shared note" : "Private note"} · <time dateTime={note.updated_at}>{day}</time>
        </p>
        <h1 id="note-title" className="mt-1.5 text-balance break-words font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{note.title}</h1>
      </Cover>

      <CoverSheet className="max-w-2xl">
        <article aria-label={shared ? "Shared note" : "Private note"}>
          <header className="flex items-center gap-3">
            {shared ? (
              <Avatar name={author.name} src={author.src} style={author.style} className="size-11" />
            ) : (
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
                <Lock className="size-5" />
              </span>
            )}
            <p className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[0.9375rem] font-semibold [overflow-wrap:anywhere]">
                {shared ? (note.mine ? "From you to " + partner.name : "From " + partner.name + " to you") : "Only you"}
              </span>
              <time className="text-[0.8125rem] leading-5 text-muted-foreground" dateTime={note.updated_at} title={absoluteTime(note.updated_at, timeZone)}>
                {relativeTime(note.updated_at, undefined, timeZone)}
              </time>
            </p>
          </header>

          {/* Plain text, rendered as plain text. Nothing here is parsed as markup. */}
          <div className="note-thread mt-5 pl-4">
            <p className="whitespace-pre-wrap break-words text-base leading-[1.7]">{note.body}</p>
          </div>

          {signature ? <p className="mt-5 font-display text-2xl italic">{signature}</p> : null}
        </article>

        {!note.mine && shared ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/notes/new"><PenLine className="size-4" aria-hidden="true" />Write back</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/drawings/new"><Brush className="size-4" aria-hidden="true" />Reply with a drawing</Link></Button>
          </div>
        ) : null}

        {note.mine ? (
          <EntryActions label="Change this note">
            <Button asChild variant="outline"><Link href={"/notes/" + note.id + "/edit"}><Pencil className="size-4" aria-hidden="true" />Edit note</Link></Button>
            <DeleteNote id={note.id} title={note.title} shared={shared} />
          </EntryActions>
        ) : null}
      </CoverSheet>
    </>
  );
}
