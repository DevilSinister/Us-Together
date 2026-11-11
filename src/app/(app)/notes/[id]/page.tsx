import { notFound } from "next/navigation";
import { z } from "zod";
import { NoteView } from "@/components/notes/note-view";
import { loadNote } from "@/lib/notes/data";
import { loadIdentities } from "@/lib/avatar/identities";
import { getViewerTimeZone } from "@/lib/time/viewer";

export const metadata = { title: "Note" };

/** One note: a letter between you, or a page only its writer can open. Opening a partner's letter marks it read. */
export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const timeZone = await getViewerTimeZone();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [note, identities] = await Promise.all([loadNote(id), loadIdentities()]);
  if (!note) notFound();

  const partner = { ...identities.partner, name: note.partner ?? identities.partner.name };
  return <NoteView note={note} me={identities.me} partner={partner} timeZone={timeZone} />;
}
