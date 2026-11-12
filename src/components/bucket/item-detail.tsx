"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Check, GripVertical, MapPin, Pencil, Plus, Sparkles, Tag, Trash2, Wallet, X } from "lucide-react";

import { mutateBucket } from "@/app/actions/bucket";
import { moveSubtask, subtaskProgress, type BucketItem, type BucketList, type BucketSubtask } from "@/lib/bucket/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { cn } from "@/lib/utils";
import { ItemEditor } from "./item-editor";

// lived_on and target_date are calendar dates, so they are formatted at UTC: a viewer's zone must not move the day.
const livedFormat = new Intl.DateTimeFormat("en", { timeZone: "UTC", dateStyle: "long" });
const localToday = () => new Date().toLocaleDateString("en-CA");
const heading = "font-display text-[1.375rem] leading-[1.3]";
const quiet = "inline-flex min-h-11 items-center gap-2 self-start rounded-control text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

function targetLine(day: string) {
  const sameYear = day.slice(0, 4) === String(new Date().getUTCFullYear());
  return "By " + new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: sameYear ? undefined : "numeric", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
}
function costLine(minor: number, currency: string | null) {
  const amount = (minor / 100).toLocaleString("en", { minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return `About ${currency ? currency + " " : ""}${amount}`;
}

/**
 * The sheet of one bucket idea (the band is the page's): its story, quiet
 * fact lines for the category, place, target and cost, the steps as tick
 * rows, then "Make it a plan" with "We lived it" beneath, and Edit and
 * Delete at the foot. Renaming, reordering (arrows, a drag handle, or hold and
 * drag on a phone) and removing steps live behind "Edit steps". Once lived, a
 * raised panel keeps the day you lived it and leads to the memory.
 */
export function ItemDetail({ item, subtasks, lists = [], categories = [] }: {
  item: BucketItem;
  subtasks: BucketSubtask[];
  lists?: BucketList[];
  categories?: readonly string[] | string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [editingSteps, setEditingSteps] = useState(false);
  const [adding, setAdding] = useState(false);
  const [touchDrag, setTouchDrag] = useState<{ sourceId: string; targetId: string } | null>(null);
  const touchHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPointerId = useRef<number | null>(null);
  const progress = subtaskProgress(subtasks);
  const done = item.status === "completed";

  function submit(command: unknown, success: string, after?: () => void) {
    start(async () => {
      try {
        const result = await mutateBucket(command);
        setMessage(result.ok ? { text: success, error: false } : { text: result.message, error: true });
        if (result.ok) {
          router.refresh();
          after?.();
        }
      } catch {
        setMessage({ text: "Connection interrupted. Try again when you are online.", error: true });
      }
    });
  }

  function step(kind: "add" | "update" | "delete" | "reorder", task: BucketSubtask | null, label = "", completed = false, orderedIds: string[] = []) {
    submit(
      { operation: "subtask", id: item.id, version: item.version, kind, subtaskId: task?.id ?? null, label, completed, orderedIds },
      kind === "reorder" ? "Step order saved." : "Steps updated.",
    );
  }

  function clearTouchHold() {
    if (touchHoldTimer.current) {
      clearTimeout(touchHoldTimer.current);
      touchHoldTimer.current = null;
    }
    touchPointerId.current = null;
  }

  function reorderTouchStep(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const orderedIds = subtasks.map((subtask) => subtask.id);
    const sourceIndex = orderedIds.indexOf(sourceId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = orderedIds.splice(sourceIndex, 1);
    orderedIds.splice(targetIndex, 0, moved);
    step("reorder", null, "", false, orderedIds);
  }

  return (
    <div className="flex flex-col gap-7">
      {item.description || item.category || item.location || item.target_date || item.estimated_cost_minor !== null ? (
        <div className="flex flex-col gap-4">
          {item.description ? <p className="max-w-prose whitespace-pre-wrap break-words text-base leading-[1.7] text-foreground/90">{item.description}</p> : null}
          <ul className="flex flex-col gap-2.5 text-[0.9375rem] empty:hidden">
            {item.category ? <Fact icon={Tag}>{item.category}</Fact> : null}
            {item.location ? <Fact icon={MapPin}>{item.location}</Fact> : null}
            {item.target_date && !done ? <Fact icon={CalendarDays}>{targetLine(item.target_date)}</Fact> : null}
            {item.estimated_cost_minor !== null ? <Fact icon={Wallet}>{costLine(item.estimated_cost_minor, item.currency)}</Fact> : null}
          </ul>
        </div>
      ) : null}

      {done ? (
        <section aria-labelledby="lived-title" className="flex flex-col gap-3 rounded-panel bg-secondary p-4">
          <h2 id="lived-title" className={heading}>One more dream lived.</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {item.lived_on
              ? <>You lived it on <time dateTime={item.lived_on} className="font-semibold text-foreground">{livedFormat.format(new Date(`${item.lived_on}T00:00:00Z`))}</time>, and that is where it sits in your story.</>
              : "Completion is saved. Your story can follow when you are ready."}
          </p>
          <Button asChild><Link href={`/memories/new?bucket=${item.id}`}><Sparkles className="size-4" aria-hidden="true" />Save this as a memory</Link></Button>
          <form method="post" className="flex items-end gap-2" onSubmit={(event) => {
            event.preventDefault();
            const livedOn = String(new FormData(event.currentTarget).get("livedOn"));
            submit({ operation: "setLivedOn", id: item.id, version: item.version, livedOn }, "The day you lived it is saved.");
          }}>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-semibold">
              The day you lived it
              <Input name="livedOn" type="date" required max={localToday()} defaultValue={item.lived_on ?? localToday()} key={item.lived_on} disabled={pending} />
            </label>
            <Button type="submit" variant="outline" className="shrink-0" disabled={pending}>Change the day</Button>
          </form>
          <p className="text-xs leading-5 text-muted-foreground">A memory kept from this dream moves to the same day.</p>
        </section>
      ) : null}

      <section aria-labelledby="steps-title" className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="steps-title" className={heading}>Steps</h2>
          {progress.total ? <span className="text-[0.8125rem] text-muted-foreground">{progress.completed} of {progress.total} done</span> : null}
        </div>

        {!subtasks.length ? (
          <p className="py-1 text-[0.9375rem] leading-6 text-muted-foreground">No steps yet. One small step is enough to start.</p>
        ) : editingSteps ? (
          <>
            <p className="pb-1 text-xs leading-5 text-muted-foreground">Hold and drag a step to reorder on a phone. On a computer, use the arrows or the handle.</p>
            <div className="divide-y divide-border">
              {subtasks.map((task, index) => (
                <div
                  key={task.id}
                  data-step-id={task.id}
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (pending || event.pointerType !== "touch" || target.closest("button")) return;
                    touchPointerId.current = event.pointerId;
                    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic events do not own a browser pointer; real touch events do. */ }
                    touchHoldTimer.current = setTimeout(() => {
                      setTouchDrag({ sourceId: task.id, targetId: task.id });
                      touchHoldTimer.current = null;
                    }, 350);
                  }}
                  onPointerMove={(event) => {
                    if (!touchDrag || event.pointerId !== touchPointerId.current) return;
                    event.preventDefault();
                    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-step-id]");
                    const targetId = target?.dataset.stepId;
                    if (targetId && targetId !== touchDrag.targetId) setTouchDrag({ ...touchDrag, targetId });
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerId !== touchPointerId.current) return;
                    const completedDrag = touchDrag;
                    clearTouchHold();
                    setTouchDrag(null);
                    if (completedDrag) reorderTouchStep(completedDrag.sourceId, completedDrag.targetId);
                  }}
                  onPointerCancel={() => { clearTouchHold(); setTouchDrag(null); }}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = subtasks.findIndex((candidate) => candidate.id === event.dataTransfer.getData("application/x-us-together-step"));
                    if (pending || fromIndex < 0 || fromIndex === index) return;
                    const ordered = subtasks.map((candidate) => candidate.id);
                    const [moved] = ordered.splice(fromIndex, 1);
                    ordered.splice(index, 0, moved);
                    step("reorder", null, "", false, ordered);
                  }}
                  className={cn(
                    "flex items-center gap-1 py-2 transition-colors",
                    touchDrag?.sourceId === task.id ? "bg-secondary/70 ring-2 ring-inset ring-primary/40" : touchDrag?.targetId === task.id ? "bg-secondary/50" : "",
                  )}
                >
                  <div
                    draggable={!pending}
                    onDragStart={(event) => { event.dataTransfer.setData("application/x-us-together-step", task.id); event.dataTransfer.effectAllowed = "move"; }}
                    aria-hidden="true"
                    className="hidden size-11 shrink-0 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing lg:grid"
                    title="Drag to reorder"
                  >
                    <GripVertical className="size-4" />
                  </div>
                  <form method="post" className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(event) => {
                    event.preventDefault();
                    step("update", task, String(new FormData(event.currentTarget).get("label")), task.is_completed);
                  }}>
                    <Input name="label" aria-label={`Step ${index + 1}`} defaultValue={task.label} key={task.label} required maxLength={240} disabled={pending} className="min-h-11 min-w-0 flex-1 px-2.5" />
                    <Button type="submit" variant="ghost" size="sm" className="min-h-11 shrink-0 px-3 text-primary" aria-label="Save step" disabled={pending}>Save</Button>
                  </form>
                  <Button variant="ghost" size="sm" type="button" className="hidden size-11 p-0 text-muted-foreground hover:text-foreground lg:inline-flex" disabled={pending || index === 0} aria-label={`Move ${task.label} up`} onClick={() => step("reorder", null, "", false, moveSubtask(subtasks.map((t) => t.id), task.id, -1))}><ArrowUp className="size-3.5" /></Button>
                  <Button variant="ghost" size="sm" type="button" className="hidden size-11 p-0 text-muted-foreground hover:text-foreground lg:inline-flex" disabled={pending || index === subtasks.length - 1} aria-label={`Move ${task.label} down`} onClick={() => step("reorder", null, "", false, moveSubtask(subtasks.map((t) => t.id), task.id, 1))}><ArrowDown className="size-3.5" /></Button>
                  <Button variant="ghost" size="sm" type="button" className="size-11 shrink-0 p-0 text-muted-foreground hover:text-danger" disabled={pending} aria-label={`Remove step ${task.label}`} onClick={() => step("delete", task)}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <ul className="flex flex-col">
            {subtasks.map((task) => (
              <li key={task.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-[0.9375rem] leading-6">
                  <input type="checkbox" className="peer sr-only" checked={task.is_completed} disabled={pending} onChange={(event) => step("update", task, task.label, event.target.checked)} />
                  <span aria-hidden="true" className={cn(
                    "grid size-[1.375rem] shrink-0 place-items-center rounded-[0.375rem] border transition-colors duration-150 motion-reduce:transition-none",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    task.is_completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/60",
                  )}>
                    {task.is_completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className={cn("min-w-0 break-words", task.is_completed && "text-muted-foreground line-through decoration-muted-foreground/60")}>{task.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form method="post" className="mt-1 flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const label = String(new FormData(form).get("label"));
            submit({ operation: "subtask", id: item.id, version: item.version, kind: "add", subtaskId: null, label, completed: false, orderedIds: [] }, "Step added.", () => form.reset());
          }}>
            <label htmlFor="next-step" className="sr-only">Next little step</label>
            <Input id="next-step" name="label" autoFocus required maxLength={240} placeholder="What would bring this closer?" className="min-w-0 flex-1" />
            <Button className="shrink-0" disabled={pending || subtasks.length >= 50}>Add step</Button>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-x-5">
          <button type="button" className={quiet} onClick={() => setAdding((value) => !value)} aria-expanded={adding}>
            {adding ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}{adding ? "Close" : "Add a step"}
          </button>
          {subtasks.length ? (
            <button type="button" className={cn(quiet, "text-muted-foreground hover:text-foreground")} onClick={() => setEditingSteps((value) => !value)} aria-pressed={editingSteps}>
              {editingSteps ? "Done editing" : "Edit steps"}
            </button>
          ) : null}
        </div>
      </section>

      {done ? null : completing ? (
        <form method="post" className="flex flex-col gap-3 rounded-panel bg-secondary p-4" onSubmit={(event) => {
          event.preventDefault();
          const livedOn = String(new FormData(event.currentTarget).get("livedOn"));
          submit({ operation: "completeItem", id: item.id, version: item.version, livedOn }, "One more dream lived. Completion saved.", () => setCompleting(false));
        }}>
          <h2 className={heading}>When did you live it?</h2>
          <p className="text-sm leading-6 text-muted-foreground">Our Story places it on this day. You can change it later.</p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold sm:max-w-xs">
            The day you lived it
            <Input name="livedOn" type="date" required max={localToday()} defaultValue={localToday()} disabled={pending} autoFocus />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}><Check className="size-4" aria-hidden="true" />Mark it lived</Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setCompleting(false)}>Not yet</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="w-full"><Link href={`/plans/new?bucket=${item.id}`}><CalendarDays className="size-4" aria-hidden="true" />Make it a plan</Link></Button>
          <Button variant="outline" className="w-full" disabled={pending} onClick={() => setCompleting(true)}><Check className="size-4" aria-hidden="true" />We lived it</Button>
        </div>
      )}

      <section aria-label="Change this idea" className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="grid grid-cols-2 gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Pencil className="size-4" aria-hidden="true" />Edit</Button>
            </DialogTrigger>
            <DialogContent title="Edit bucket idea" className="max-w-2xl" dismissible={!editPending}>
              <DialogHeader>
                <DialogTitle>Edit the idea</DialogTitle>
                <DialogDescription>Refine your shared plans, timing, location, or details.</DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <ItemEditor lists={lists} item={item} categories={categories} key={item.version} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} onPendingChange={setEditPending} />
              </div>
            </DialogContent>
          </Dialog>
          <ConfirmDelete
            label="Delete"
            className="w-full"
            title="Delete this idea?"
            description={<>
              <strong className="font-semibold text-foreground">&ldquo;{item.title}&rdquo;</strong> and its steps leave your shared bucket list for good.
              Plans and memories made from it stay, without the link back.
            </>}
            leavesPage
            onConfirm={async () => {
              const result = await mutateBucket({ operation: "deleteItem", id: item.id, version: item.version, confirmation: "DELETE" });
              if (!result.ok) return result.message;
              router.push(`/bucket/lists/${item.list_id}`);
              router.refresh();
            }}
          />
        </div>
      </section>

      {/* Saving is announced politely; a failure also shows above the navigation, wherever it happened. */}
      <p role="status" className="sr-only">{pending ? "Saving…" : message && !message.error ? message.text : ""}</p>
      {message?.error ? (
        <div role="alert" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-start gap-3 rounded-panel bg-foreground p-4 text-sm leading-6 text-background shadow-[0_14px_30px_-14px_rgb(0_0_0/0.7)] md:bottom-6">
          <span className="flex-1">{message.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setMessage(null)} className="-m-2 grid size-11 shrink-0 place-items-center rounded-control focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" aria-hidden="true" /></button>
        </div>
      ) : null}
    </div>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-[0.1875rem] size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}
