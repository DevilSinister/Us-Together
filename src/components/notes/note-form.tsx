"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { CircleAlert, Lock, Users } from "lucide-react";
import { saveNote } from "@/app/actions/notes";
import { noteTypes, type Note, type NoteType } from "@/lib/notes/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass = "w-full rounded-control border border-border bg-field px-4 py-3 text-base leading-7 text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";
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

/**
 * The note form, in the Cover form pattern: one column of labelled fields on
 * the sheet and one full-width action. Who can read it is a two-way choice, so
 * it is a pair of equal controls with the chosen one's consequence spelled out
 * beneath, rather than two cards of explanation. The way out is the round back
 * button on the page's band, so there is no Cancel here.
 */
export function NoteForm({ note }: { note?: Note }) {
  const router = useRouter();
  const hintId = useId();
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
      className="flex flex-col gap-4"
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
      {/* min-w-0: a fieldset's default min-content width would otherwise widen the whole form on a phone. */}
      <fieldset className="min-w-0" aria-describedby={hintId}>
        <legend className="text-sm font-semibold">Who can read it</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {noteTypes.map((value) => {
            const Icon = copy[value].icon;
            const active = type === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border px-3 text-sm font-semibold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring motion-reduce:transition-none",
                  active ? "border-primary bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input type="radio" name="type" value={value} checked={active} onChange={() => setType(value)} className="sr-only" />
                <Icon className="size-4" aria-hidden="true" />{copy[value].label}
              </label>
            );
          })}
        </div>
        <p id={hintId} className="mt-2 text-[0.8125rem] leading-5 text-muted-foreground">
          {copy[type].hint}
          {type === "private" && editingShared ? <span className="text-foreground"> Switching to private withdraws the inbox line your partner already received.</span> : null}
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="title">Title</Label>
          <Counter value={title.length} max={TITLE_MAX} />
        </div>
        <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Something I keep meaning to say" required aria-invalid={Boolean(fields.title)} />
        {fields.title ? <p className="field-error">{fields.title[0]}</p> : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="body">The note</Label>
          <Counter value={body.length} max={BODY_MAX} />
        </div>
        <textarea id="body" name="body" rows={10} className={fieldClass} value={body} onChange={(event) => setBody(event.target.value)} required aria-invalid={Boolean(fields.body)} />
        {fields.body ? <p className="field-error">{fields.body[0]}</p> : null}
        <p className="text-[0.8125rem] leading-5 text-muted-foreground">Saved and shown as plain text, exactly as you typed it.</p>
      </div>

      {message ? <div role="alert" className="status-message status-error"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{message}</div> : null}

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button size="lg" disabled={pending} className="w-full sm:w-auto">{pending ? "Saving..." : note ? "Save changes" : "Keep this note"}</Button>
        {dirty && !pending ? <span className="text-center text-xs text-muted-foreground sm:text-left" aria-live="polite">Unsaved changes</span> : null}
      </div>
    </form>
  );
}
