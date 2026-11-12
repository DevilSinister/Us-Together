import type { Metadata } from "next";
import Link from "next/link";
import { PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { NoteRows } from "@/components/notes/note-rows";
import { loadNotes } from "@/lib/notes/data";
import { loadIdentities } from "@/lib/avatar/identities";
import { getViewerTimeZone } from "@/lib/time/viewer";

export const metadata: Metadata = { title: "Notes" };

/**
 * Notes as a Cover screen. Words have no photograph to lead with, so the cover
 * is a band; the sheet beneath is the list, newest first, with an explicit
 * link to older pages.
 */
export default async function NotesPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const timeZone = await getViewerTimeZone();
  const { after } = await searchParams;
  const [view, identities] = await Promise.all([loadNotes(after), loadIdentities()]);
  const partner = { ...identities.partner, name: view.partner ?? "your partner" };

  return (
    <>
      <Cover
        labelledBy="notes-title"
        height="band"
        action={view.paired ? <Button asChild><Link href="/notes/new"><Plus className="size-4" aria-hidden="true" />Write a note</Link></Button> : null}
      >
        <h1 id="notes-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">Notes</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Letters to each other, and pages of your own</p>
      </Cover>

      <CoverSheet>
        {view.error ? <p role="alert" className="status-message status-error">{view.error}</p> : null}

        {!view.paired && !view.error ? (
          <PairingNotice
            className="mt-0"
            title="Notes open with your shared space."
            body="A shared note reaches your partner and a private note never leaves you, so both wait until your accounts are connected."
          />
        ) : null}

        {view.paired ? (
          view.notes.length ? (
            <div className="max-w-3xl">
              <NoteRows notes={view.notes} me={identities.me} partner={partner} timeZone={timeZone} />
              {view.next ? (
                <Link
                  href={"/notes?after=" + encodeURIComponent(view.next)}
                  className="mt-4 inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Older notes
                </Link>
              ) : null}
            </div>
          ) : (
            <EmptyState
              className="mt-2"
              icon={PenLine}
              title="Say the thing you keep forgetting to say."
              body="A shared note lands in your partner's inbox. A private one stays with you, for the thoughts that are not ready yet."
              action={<Button asChild><Link href="/notes/new">Write the first note</Link></Button>}
            />
          )
        ) : null}
      </CoverSheet>

      {view.paired ? <FloatingAction href="/notes/new" label="Write a note" /> : null}
    </>
  );
}
