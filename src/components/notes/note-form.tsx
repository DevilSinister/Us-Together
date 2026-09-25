"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert, Lock, Users } from "lucide-react";
import { saveNote } from "@/app/actions/notes";
import { noteTypes, type Note, type NoteType } from "@/lib/notes/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass = "w-full rounded-control border border-border bg-field px-4 py-3 text-base leading-8 text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";
const TITLE_MAX = 160;
const BODY_MAX = 20000;

const copy: Record<NoteType, { label: string; hint: string; icon: typeof Users }> = {
  shared: { label: "Shared", hint: "Your partner can read this, and gets a quiet inbox line saying a note arrived.", icon: Users },
  private: { label: "Private", hint: "Only you can read this. Your partner is never told it exists.", icon: Lock },
};

/** Counters go amber near the limit; the server still trims and validates. */
function Counter({ value, max }: { value: number; max: number }) {
  const near = value > max * 0.9;
  return (
    <span aria-live="polite" className={cn("text-xs tabular-nums", near ? "font-semibold text-danger" : "text-muted-foreground")}>
      {value.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

export function NoteForm({ note }: { note?: Note }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initialType = (note?.type as NoteType) ?? "shared";
  const [type, setType] = useState<NoteType>(initialType);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  const dirty = !saved && (title !== (note?.title ?? "") || body !== (note?.body ?? "") || type !== initialType);
  const editingShared = Boolean(note) && initialType === "shared";

  // Leaving with unsaved words would lose them silently; the browser asks first.
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  return (
    <form method="post"
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          setMessage("");
          setFields({});
          const result = await saveNote({ id: note?.id, type, title, body });
          if (result.error) { setMessage(result.error); setFields(result.fields ?? {}); return; }
          setSaved(true);
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
                  {value === "private" && editingShared ? (
                    <span className="mt-2 block leading-6 text-foreground">Switching to private withdraws the inbox line your partner already received.</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="title">Title</Label>
          <Counter value={title.length} max={TITLE_MAX} />
        </div>
        <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Something I keep meaning to say" required aria-invalid={Boolean(fields.title)} />
        {fields.title ? <p className="field-error">{fields.title[0]}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="body">The note</Label>
          <Counter value={body.length} max={BODY_MAX} />
        </div>
        <textarea id="body" name="body" rows={14} className={fieldClass} value={body} onChange={(event) => setBody(event.target.value)} required aria-invalid={Boolean(fields.body)} />
        {fields.body ? <p className="field-error">{fields.body[0]}</p> : null}
        <p className="text-sm text-muted-foreground">Saved and shown as plain text, exactly as you typed it.</p>
      </div>

      {message ? <div role="alert" className="status-message status-error"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{message}</div> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Saving..." : note ? "Save changes" : "Keep this note"}</Button>
        <Button asChild variant="ghost"><Link href={note ? "/notes/" + note.id : "/notes"}>Cancel</Link></Button>
        {dirty && !pending ? <span className="text-xs text-muted-foreground" aria-live="polite">Unsaved changes</span> : null}
      </div>
    </form>
  );
}
