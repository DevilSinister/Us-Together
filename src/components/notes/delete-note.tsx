"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteNote } from "@/app/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteNote({ id, shared }: { id: string; shared: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  return (
    <details className="mt-12 border-t pt-5">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-danger">Delete this note</summary>
      <p className="mt-3 max-w-prose leading-7 text-muted-foreground">
        {shared ? "Your partner loses access to this note as well." : "Only you could read this, so only you lose it."}
      </p>
      {error ? <p role="alert" className="status-message status-error mt-4">{error}</p> : null}
      <form
        className="mt-5 max-w-sm space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await deleteNote(id);
            if (result.error) { setError(result.error); return; }
            router.push("/notes");
            router.refresh();
          });
        }}
      >
        <Label htmlFor="delete-note">Type DELETE to confirm</Label>
        <Input id="delete-note" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        <Button variant="outline" className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" disabled={pending || confirmation !== "DELETE"}>
          Permanently delete note
        </Button>
      </form>
    </details>
  );
}
