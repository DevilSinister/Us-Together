import { notFound } from "next/navigation";
import { z } from "zod";
import { Cover, CoverSheet } from "@/components/app/cover";
import { NoteForm } from "@/components/notes/note-form";
import { loadNote } from "@/lib/notes/data";

export const metadata = { title: "Edit note" };

/** Editing your own note, in the Cover form pattern. Only its writer reaches this page. */
export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadNote(id);
  if (!note || !note.mine) notFound();

  return (
    <>
      <Cover labelledBy="note-form-title" height="band" back={{ href: "/notes/" + id, label: "Back to this note" }}>
        <h1 id="note-form-title" className="font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">Edit note</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Change what it says.</p>
      </Cover>
      <CoverSheet className="max-w-2xl">
        <NoteForm note={note} />
      </CoverSheet>
    </>
  );
}
