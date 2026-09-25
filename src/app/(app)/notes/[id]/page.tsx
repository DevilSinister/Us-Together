import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, Brush, Lock, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/app/avatar";
import { EntryActions } from "@/components/app/entry-actions";
import { DeleteNote } from "@/components/notes/delete-note";
import { loadNote } from "@/lib/notes/data";
import { loadIdentities } from "@/lib/avatar/identities";
import { absoluteTime, relativeTime } from "@/lib/time/relative";
import { cn } from "@/lib/utils";

export const metadata = { title: "Note" };

/**
 * A note reads as what it is. A shared note is a letter: paper lifted off the
 * page, the author's face at the top and their name signed at the foot. A
 * private note is a page from your own journal: flat, tinted, and sealed with
 * a lock, so the two can never be mistaken for each other.
 */
export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [note, identities] = await Promise.all([loadNote(id), loadIdentities()]);
  if (!note) notFound();

  const shared = note.type === "shared";
  const Icon = shared ? Users : Lock;
  const partner = note.partner ?? identities.partner.name;
  const author = note.mine ? identities.me : { ...identities.partner, name: partner };
  const signature = note.mine ? (author.name === "You" ? null : author.name) : partner;

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <PageHeader
        scale="compact"
        rule={false}
        eyebrow={note.mine ? "You wrote this" : "From " + partner}
        title={note.title}
        back={<InlineLink href="/notes"><ArrowLeft className="size-4" aria-hidden="true" />Back to notes</InlineLink>}
      />

      <article
        aria-label={shared ? "Shared note" : "Private note"}
        className={cn("rounded-surface p-6 sm:p-9", shared ? "bg-card shadow-paper" : "bg-muted")}
      >
        <header className="flex items-center gap-3 border-b pb-5">
          <Avatar name={author.name} src={author.src} style={author.style} size="md" />
          <p className="min-w-0 flex-1 text-sm leading-6">
            <span className="block font-semibold">{note.mine ? "From you" : "From " + partner}{shared ? (note.mine ? " to " + partner : " to you") : ""}</span>
            <time className="text-muted-foreground" dateTime={note.updated_at} title={absoluteTime(note.updated_at)}>{relativeTime(note.updated_at)}</time>
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            <Icon className="size-3.5" aria-hidden="true" />{shared ? "Shared" : "Only you"}
          </span>
        </header>

        {/* Plain text, rendered as plain text. Nothing here is parsed as markup. */}
        <div className="note-thread mt-6 pl-5 sm:pl-6">
          <p className="whitespace-pre-wrap break-words text-lg leading-8">{note.body}</p>
        </div>

        {signature ? <p className="mt-8 text-right font-display text-xl italic text-muted-foreground">— {signature}</p> : null}
      </article>

      {!note.mine && shared ? (
        <div className="mt-8">
          <InlineLink href="/drawings/new"><Brush className="size-4" aria-hidden="true" />Reply with a drawing</InlineLink>
        </div>
      ) : null}

      {note.mine ? (
        <EntryActions label="Change this note">
          <Button asChild variant="outline"><Link href={"/notes/" + note.id + "/edit"}><Pencil className="size-4" aria-hidden="true" />Edit note</Link></Button>
          <DeleteNote id={note.id} title={note.title} shared={shared} />
        </EntryActions>
      ) : null}
    </div>
  );
}
