import type { Metadata } from "next";
import Link from "next/link";
import { Lock, PenLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { loadNotes } from "@/lib/notes/data";
import { noteExcerpt } from "@/lib/notes/schema";
import { absoluteTime, relativeTime } from "@/lib/time/relative";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const view = await loadNotes(after);
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
                return (
                  <li key={note.id}>
                    <Link href={"/notes/" + note.id} className="flex gap-4 py-6 hover:bg-secondary/40">
                      <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="break-words font-display text-2xl">{note.title}</span>
                          {!shared ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">Private</span> : null}
                          {shared && !note.read ? <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">New</span> : null}
                        </span>
                        <span className="mt-2 block text-sm text-muted-foreground">
                          {note.mine ? "You" : partner} · <time dateTime={note.updated_at} title={absoluteTime(note.updated_at)}>{relativeTime(note.updated_at)}</time>
                        </span>
                        <span className="mt-2 block line-clamp-2 break-words leading-7 text-muted-foreground">{noteExcerpt(note.body)}</span>
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
