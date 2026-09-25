"use client";
import { useRouter } from "next/navigation";
import { deleteNote } from "@/app/actions/notes";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

export function DeleteNote({ id, title, shared }: { id: string; title: string; shared: boolean }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      label="Delete note"
      title="Delete this note?"
      description={<>
        <strong className="font-semibold text-foreground">“{title}”</strong> is removed for good.{" "}
        {shared ? "Your partner loses it too." : "Only you could read it, so only you lose it."}
      </>}
      leavesPage
      onConfirm={async () => {
        const result = await deleteNote(id);
        if (result.error) return result.error;
        router.push("/notes");
        router.refresh();
      }}
    />
  );
}
