"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { mutateBucket } from "@/app/actions/bucket";
import { floatingActionClass } from "@/components/app/cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Starting a new list: the floating button on a phone and a band button from
 * tablet width open the same small dialog. Once made, the new list opens, so
 * the next thing to do is add its first dream.
 */
export function NewList({ placement }: { placement: "band" | "floating" | "empty" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function create(form: FormData) {
    start(async () => {
      setMessage("");
      try {
        const result = await mutateBucket({ operation: "createList", title: form.get("title") });
        if (!result.ok || !result.id) { setMessage(result.message); return; }
        setOpen(false);
        router.push(`/bucket/lists/${result.id}`);
      } catch {
        setMessage("Connection interrupted. Check your lists before trying again.");
      }
    });
  }

  const trigger = placement === "floating"
    ? <button type="button" aria-label="New list" className={floatingActionClass} onClick={() => setOpen(true)}><Plus className="size-6" aria-hidden="true" /></button>
    : <Button type="button" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden="true" />{placement === "empty" ? "Make your first list" : "New list"}</Button>;

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); setMessage(""); } }}>
        <DialogContent title="New list" className="max-w-md" dismissible={!pending}>
          <DialogHeader>
            <DialogTitle>New list</DialogTitle>
            <DialogDescription>A theme, a season, or a place you keep talking about.</DialogDescription>
          </DialogHeader>
          <form method="post" className="mt-5 flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); create(new FormData(event.currentTarget)); }}>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              List name
              <Input name="title" required maxLength={120} placeholder="Close to home" autoFocus disabled={pending} />
            </label>
            {message ? <p role="alert" className="field-error">{message}</p> : null}
            <Button disabled={pending} className="w-full">{pending ? "Making it…" : "Make the list"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
