"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert, Lock, Users } from "lucide-react";
import { saveNote } from "@/app/actions/notes";
import { noteTypes, type Note, type NoteType } from "@/lib/notes/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass = "w-full rounded-control border border-border bg-field px-4 py-3 text-base leading-8 text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";

const copy: Record<NoteType, { label: string; hint: string; icon: typeof Users }> = {
  shared: { label: "Shared", hint: "Your partner can read this, and gets a quiet inbox line saying a note arrived.", icon: Users },
  private: { label: "Private", hint: "Only you can read this. Your partner is never told it exists.", icon: Lock },
};

export function NoteForm({ note }: { note?: Note }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<NoteType>((note?.type as NoteType) ?? "shared");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        start(async () => {
          setMessage("");
          setFields({});
          const result = await saveNote({ id: note?.id, type, title: String(data.get("title") ?? ""), body: String(data.get("body") ?? "") });
          if (result.error) { setMessage(result.error); setFields(result.fields ?? {}); return; }
          router.push(result.id ? "/notes/" + result.id : "/notes");
          router.refresh();
        });
      }}
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Who can read it</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {noteTypes.map((value) => {
            const Icon = copy[value].icon;
            const active = type === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-panel border p-4 text-sm",
                  active ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60",
                )}
              >
                <input type="radio" name="type" value={value} checked={active} onChange={() => setType(value)} className="mt-1 size-4 accent-[var(--primary)]" />
                <span>
                  <span className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-primary" aria-hidden="true" />{copy[value].label}</span>
                  <span className="mt-1 block leading-6 text-muted-foreground">{copy[value].hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={note?.title} placeholder="Something I keep meaning to say" required aria-invalid={Boolean(fields.title)} />
        {fields.title ? <p className="field-error">{fields.title[0]}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">The note</Label>
        <textarea id="body" name="body" rows={14} className={fieldClass} defaultValue={note?.body} required aria-invalid={Boolean(fields.body)} />
        {fields.body ? <p className="field-error">{fields.body[0]}</p> : null}
        <p className="text-sm text-muted-foreground">Saved and shown as plain text, exactly as you typed it.</p>
      </div>

      {message ? <div role="alert" className="status-message status-error"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{message}</div> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Saving..." : note ? "Save changes" : "Keep this note"}</Button>
        <Button asChild variant="ghost"><Link href={note ? "/notes/" + note.id : "/notes"}>Cancel</Link></Button>
      </div>
    </form>
  );
}
