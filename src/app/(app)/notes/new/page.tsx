import type { Metadata } from "next";
import { Cover, CoverSheet } from "@/components/app/cover";
import { PairingNotice } from "@/components/app/states";
import { NoteForm } from "@/components/notes/note-form";
import { loadNotes } from "@/lib/notes/data";

export const metadata: Metadata = { title: "New note" };

/** Writing a note, in the Cover form pattern: a band that names the task and leads back, then the form on the sheet. */
export default async function NewNotePage() {
  const view = await loadNotes();
  return (
    <>
      <Cover labelledBy="note-form-title" height="band" back={{ href: "/notes", label: "Back to notes" }}>
        <h1 id="note-form-title" className="font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">New note</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Put it into words.</p>
      </Cover>
      <CoverSheet className="max-w-2xl">
        {view.paired ? <NoteForm /> : <PairingNotice className="mt-0" title="Notes open with your shared space." />}
      </CoverSheet>
    </>
  );
}
