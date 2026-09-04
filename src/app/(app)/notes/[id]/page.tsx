import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { DeleteNote } from "@/components/notes/delete-note";
import { loadNote } from "@/lib/notes/data";

export const metadata = { title: "Note" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadNote(id);
  if (!note) notFound();

  const shared = note.type === "shared";
  const Icon = shared ? Users : Lock;
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <PageHeader
        eyebrow={note.mine ? "You wrote this" : "From your partner"}
        title={note.title}
        back={<InlineLink href="/notes"><ArrowLeft className="size-4" aria-hidden="true" />Back to notes</InlineLink>}
        actions={note.mine ? <Button asChild variant="outline"><Link href={"/notes/" + note.id + "/edit"}>Edit note</Link></Button> : null}
      />

      <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {shared ? "Shared with your partner" : "Private to you"} · {formatter.format(new Date(note.updated_at))}
      </p>

      {/* Plain text, rendered as plain text. Nothing here is parsed as markup. */}
      <p className="mt-8 whitespace-pre-wrap break-words text-lg leading-8">{note.body}</p>

      {note.mine ? <DeleteNote id={note.id} shared={shared} /> : null}
    </div>
  );
}
