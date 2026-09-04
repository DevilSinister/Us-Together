import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { NoteForm } from "@/components/notes/note-form";
import { loadNotes } from "@/lib/notes/data";

export const metadata: Metadata = { title: "New note" };

export default async function NewNotePage() {
  const view = await loadNotes();
  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <PageHeader
        scale="compact"
        eyebrow="Yours to write"
        title="Put it into words."
        back={<InlineLink href="/notes"><ArrowLeft className="size-4" aria-hidden="true" />Back to notes</InlineLink>}
      />
      {view.paired ? <section className="mt-9"><NoteForm /></section> : <PairingNotice title="Notes open with your shared space." />}
    </div>
  );
}
