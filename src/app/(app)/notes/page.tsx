import type { Metadata } from "next";
import Link from "next/link";
import { Lock, PenLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/app/avatar";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { loadNotes } from "@/lib/notes/data";
import { loadIdentities } from "@/lib/avatar/identities";
import { noteExcerpt } from "@/lib/notes/schema";
import { absoluteTime, relativeTime } from "@/lib/time/relative";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const [view, identities] = await Promise.all([loadNotes(after), loadIdentities()]);
  const partner = view.partner ?? "Your partner";

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="Words worth keeping"
        title="Notes between you."
        lede="Write something to share, or something only you will ever read."
        actions={view.paired ? <Button asChild><Link href="/notes/new">Write a note</Link></Button> : null}
      />

      {view.error ? <p role="alert" className="status-message status-error mt-8">{view.error}</p> : null}

      {!view.paired && !view.error ? (
        <PairingNotice
          title="Notes open with your shared space."
          body="A shared note reaches your partner and a private note never leaves you, so both wait until your accounts are connected."
        />
      ) : null}

      {view.paired ? (
        view.notes.length ? (
          <>
            <ul className="mt-10 divide-y border-y">
              {view.notes.map((note) => {
                const shared = note.type === "shared";
                const Icon = shared ? Users : Lock;
                const author = note.mine ? identities.me : { ...identities.partner, name: partner };
                return (
                  <li key={note.id}>
                    <Link href={"/notes/" + note.id} className="group -mx-3 flex gap-4 rounded-panel px-3 py-5 transition-colors duration-200 hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
                      {/* Who wrote it, with how far it travels pinned to the face. */}
                      <span className="relative mt-1 shrink-0">
                        <Avatar name={author.name} src={author.src} style={author.style} size="md" />
                        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border bg-card text-primary">
                          <Icon className="size-3" aria-hidden="true" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 truncate font-display text-2xl leading-tight transition-colors group-hover:text-primary motion-reduce:transition-none">{note.title}</span>
                          {!shared ? <span className="mt-1 shrink-0 rounded-control bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">Private</span> : null}
                          {shared && !note.read ? <span className="mt-1 shrink-0 rounded-control bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">New</span> : null}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                          {note.mine ? "You" : partner} · <time dateTime={note.updated_at} title={absoluteTime(note.updated_at)}>{relativeTime(note.updated_at)}</time>
                        </span>
                        {/* The first words in the note's own voice: serif italic, like a line read off the page. */}
                        <span className="mt-2 line-clamp-2 break-words font-display text-lg italic leading-7 text-muted-foreground">{noteExcerpt(note.body)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {view.next ? (
              <Link href={"/notes?after=" + encodeURIComponent(view.next)} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Older notes</Link>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={PenLine}
            title="Say the thing you keep forgetting to say."
            body="A shared note lands in your partner's inbox. A private one stays with you, for the thoughts that are not ready yet."
            action={<Button asChild><Link href="/notes/new">Write the first note</Link></Button>}
          />
        )
      ) : null}
    </div>
  );
}
