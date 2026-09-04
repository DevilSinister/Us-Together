import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { NoteForm } from "@/components/notes/note-form";
import { loadNote } from "@/lib/notes/data";

export const metadata = { title: "Edit note" };

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadNote(id);
  if (!note || !note.mine) notFound();

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <PageHeader
        scale="compact"
        eyebrow="Your note"
        title="Change what it says."
        lede="Switching a shared note to private also withdraws the inbox line your partner received."
        back={<InlineLink href={"/notes/" + id}><ArrowLeft className="size-4" aria-hidden="true" />Back to this note</InlineLink>}
      />
      <section className="mt-9"><NoteForm note={note} /></section>
    </div>
  );
}
