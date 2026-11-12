"use client";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { deleteNote } from "@/app/actions/notes";
import { EntryMenu } from "@/components/app/entry-menu";

/** The corner menu on a note you wrote: Edit, and Delete behind its confirmation. */
export function NoteMenu({ id, title, shared }: { id: string; title: string; shared: boolean }) {
  const router = useRouter();
  return (
    <EntryMenu
      label="Note options"
      items={[{ kind: "link", label: "Edit note", href: "/notes/" + id + "/edit", icon: Pencil }]}
      deletion={{
        label: "Delete note",
        title: "Delete this note?",
        description: <>
          <strong className="font-semibold text-foreground">“{title}”</strong> is removed for good.{" "}
          {shared ? "Your partner loses it too." : "Only you could read it, so only you lose it."}
        </>,
        leavesPage: true,
        onConfirm: async () => {
          const result = await deleteNote(id);
          if (result.error) return result.error;
          router.push("/notes");
          router.refresh();
        },
      }}
    />
  );
}
