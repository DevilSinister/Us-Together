"use client";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowUp, Bell, CalendarDays, Check, ChevronRight, FileText, ListChecks, Map as MapIcon, MapPin,
  Paperclip, Pencil, Plus, Sparkles, Trash2, Wallet, X,
} from "lucide-react";
import { mutatePlan, deletePlanAttachment, uploadPlanAttachment } from "@/app/actions/plans";
import type { ChecklistItem, PlanDetail, Reminder } from "@/lib/plans/types";
import { initialActionState } from "@/lib/auth/types";
import { planPhase, planWhen, reminderLabel, reminderWhen, whenNext } from "@/lib/plans/list";
import { Cover, CoverSheet } from "@/components/app/cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { cn } from "@/lib/utils";

const heading = "font-display text-[1.375rem] leading-[1.3]";
const quiet = "inline-flex min-h-11 items-center gap-2 self-start rounded-control text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";
const reminderChoices = [0, 15, 60, 1440, 10080];

type Change = (input: Record<string, unknown>) => void;

/**
 * One plan as a Cover screen (ADR-053). The band says where the plan stands
 * ("Coming up in 3 days", "Did this happen?", "Kept"), its title, and when
 * and where as quiet icon lines. The sheet holds the story, then the to-do
 * list as tick rows, the reminders, the bucket idea it began as, and its
 * files, each as ruled rows. A plan whose day has come asks once, near the
 * top, whether to keep it as a memory; a kept plan ends on that memory.
 * Edit and Delete close the page, with Cancel plan quietly beneath them.
 */
export function PlanDetailView({ detail, timezone, preview, now, origin }: {
  detail: PlanDetail;
  timezone: string;
  preview: boolean;
  /** The server's clock, so first paint and hydration agree on the plan's state. */
  now: string;
  origin: { id: string; title: string; list: string | null } | null;
}) {
  const { plan: p, checklist, reminders, attachments, memoryId } = detail;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [newStep, setNewStep] = useState("");
  const clock = new Date(now);
  const phase = p.status === "planned" ? planPhase(p, timezone, clock) : null;

  function change(input: Record<string, unknown>, then?: () => void) {
    setMessage("");
    start(async () => {
      try {
        const result = await mutatePlan({ planId: p.id, version: p.version, ...input });
        if (!result.ok) { setMessage(result.message); return; }
        if (then) { then(); return; }
        if (input.operation === "checklist" && input.kind === "add") setNewStep("");
        router.refresh();
      } catch {
        setMessage("Connection interrupted. Your change was not confirmed. Try again.");
      }
    });
  }

  const kicker = p.status === "cancelled" ? "Cancelled"
    : p.status === "completed" ? (memoryId ? "Kept · saved as a memory" : "Kept")
    : phase === "past" ? "Did this happen?"
    : phase === "now" ? "Happening now"
    : "Coming up " + whenNext(p, timezone, clock);
  const keepAsMemory = () => change({ operation: "status", status: "completed" }, () => router.push("/memories/new?plan=" + p.id));
  const budget = p.budget_minor != null ? `${p.currency ?? ""} ${(p.budget_minor / 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim() : null;

  return (
    <>
      <Cover labelledBy="plan-title" height="band" back={{ href: "/plans", label: "Back to plans" }}>
        <p className={cn("text-[0.8125rem] font-semibold", p.status === "cancelled" ? "text-muted-foreground" : "text-primary")}>{kicker}</p>
        <h1 id="plan-title" className="mt-1.5 text-balance break-words font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">{p.title}</h1>
        <ul className="mt-3.5 flex flex-col gap-2 text-[0.9375rem]">
          <Fact icon={CalendarDays}>
            {planWhen(p, timezone, clock)}
            {p.originating_timezone !== timezone ? <span className="block text-[0.8125rem] text-muted-foreground">Shown in {timezone} · planned in {p.originating_timezone}</span> : null}
          </Fact>
          {p.location ? <Fact icon={MapPin}>{p.location}</Fact> : null}
          {budget ? <Fact icon={Wallet}>Budget · {budget}</Fact> : null}
        </ul>
      </Cover>

      <CoverSheet className="max-w-2xl">
        <div className="flex flex-col gap-7">
          {p.description || p.external_map_url ? (
            <div className="flex flex-col gap-2">
              {p.description ? <p className="max-w-prose whitespace-pre-wrap break-words text-base leading-[1.7] text-foreground/90">{p.description}</p> : null}
              {p.external_map_url ? (
                <a href={p.external_map_url} target="_blank" rel="noreferrer noopener" className={quiet}>
                  <MapIcon className="size-4" aria-hidden="true" />Open the map
                </a>
              ) : null}
            </div>
          ) : null}

          {phase === "past" || phase === "now" ? (
            <div className="flex flex-col gap-2 rounded-panel bg-secondary p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {phase === "past" ? "The day has passed and this is still planned. If it happened, keep it." : "Enjoy it. When it is over, keep a little of it."}
              </p>
              <Button disabled={pending} onClick={keepAsMemory}><Sparkles className="size-4" aria-hidden="true" />Keep it as a memory</Button>
              <Button variant="outline" disabled={pending} onClick={() => change({ operation: "status", status: "completed" })}>Mark it kept, no memory</Button>
            </div>
          ) : null}

          {p.status === "cancelled" ? (
            <div className="flex flex-col gap-2 rounded-panel bg-secondary p-4">
              <p className="text-sm leading-6 text-muted-foreground">Cancelled plans keep their details. Restoring brings it back to Plans.</p>
              <Button disabled={pending} onClick={() => change({ operation: "status", status: "planned" })}>Restore plan</Button>
            </div>
          ) : null}

          {(p.status === "planned" && phase !== "past") || checklist.length ? (
            <Steps steps={checklist} pending={pending} change={change} newStep={newStep} setNewStep={setNewStep} />
          ) : null}

          {(p.status === "planned" && phase !== "past") || reminders.length ? (
            <Reminders planStarts={p.starts_at} planned={p.status === "planned"} reminders={reminders} timezone={timezone} now={clock} pending={pending} change={change} preview={preview} />
          ) : null}

          {origin ? (
            <section aria-labelledby="origin-title" className="flex flex-col">
              <h2 id="origin-title" className={heading}>Where it began</h2>
              <Link href={"/bucket/" + origin.id} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <Dot icon={ListChecks} />
                <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                  <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{origin.title}</span>
                  <span className="text-[0.8125rem] leading-5 text-muted-foreground">Bucket list{origin.list ? " · " + origin.list : ""}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </section>
          ) : null}

          <Attachments planId={p.id} attachments={attachments} preview={preview} />

          {p.status === "completed" ? (
            <Button asChild size="lg" className="w-full">
              <Link href={memoryId ? "/memories/" + memoryId : "/memories/new?plan=" + p.id}>
                <Sparkles className="size-4" aria-hidden="true" />{memoryId ? "Open the memory" : "Keep it as a memory"}
              </Link>
            </Button>
          ) : null}

          <section aria-label="Change this plan" className="flex flex-col gap-3 border-t border-border pt-5">
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline"><Link href={"/plans/" + p.id + "/edit"}><Pencil className="size-4" aria-hidden="true" />Edit</Link></Button>
              <ConfirmDelete
                label="Delete"
                className="w-full"
                title="Delete this plan?"
                description={<><strong className="font-semibold text-foreground">“{p.title}”</strong>, its to-do list and its reminders are removed for both of you. A memory saved from it stays.</>}
                blocked={attachments.length ? "Remove its " + attachments.length + " " + (attachments.length === 1 ? "file" : "files") + " under Attachments first." : null}
                leavesPage
                onConfirm={async () => {
                  const result = await mutatePlan({ planId: p.id, version: p.version, operation: "delete", confirmation: "DELETE" });
                  if (!result.ok) return result.message;
                  router.push("/plans");
                  router.refresh();
                }}
              />
            </div>
            {p.status === "planned" ? (
              <div className="flex flex-wrap items-center gap-x-3">
                <button type="button" disabled={pending} onClick={() => change({ operation: "status", status: "cancelled" })} className={cn(quiet, "text-muted-foreground hover:text-foreground")}>Cancel plan</button>
                <span className="text-[0.8125rem] leading-5 text-muted-foreground">Keeps the details and stops its reminders.</span>
              </div>
            ) : null}
          </section>
        </div>
      </CoverSheet>

      {message ? (
        <div role="alert" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-start gap-3 rounded-panel bg-foreground p-4 text-sm leading-6 text-background shadow-[0_14px_30px_-14px_rgb(0_0_0/0.7)] md:bottom-6">
          <span className="flex-1">{message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setMessage("")} className="-m-2 grid size-11 shrink-0 place-items-center rounded-control focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" aria-hidden="true" /></button>
        </div>
      ) : null}
    </>
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

function Dot({ icon: Icon }: { icon: typeof MapPin }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><Icon className="size-5" aria-hidden="true" /></span>;
}

/** The to-do list: tick rows, with renaming, reordering and removal behind "Edit steps". */
function Steps({ steps, pending, change, newStep, setNewStep }: {
  steps: ChecklistItem[]; pending: boolean; change: Change; newStep: string; setNewStep: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const done = steps.filter((step) => step.is_completed).length;
  function reorder(index: number, delta: number) {
    const ids = steps.map((step) => step.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    change({ operation: "checklist", kind: "reorder", ids });
  }

  return (
    <section aria-labelledby="steps-title" className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="steps-title" className={heading}>To do</h2>
        {steps.length ? <span className="text-[0.8125rem] text-muted-foreground">{done} of {steps.length} done</span> : null}
      </div>

      {steps.length ? (
        <ul className="flex flex-col">
          {steps.map((step, index) => editing ? (
            <li key={step.id + step.label} className="border-b border-border py-2.5 last:border-0">
              <form method="post" className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); change({ operation: "checklist", kind: "update", id: step.id, label: new FormData(event.currentTarget).get("label") }); }}>
                <Input name="label" aria-label={"Step " + (index + 1)} defaultValue={step.label} maxLength={240} required className="min-w-0 flex-1" />
                <Button variant="outline" disabled={pending}>Save</Button>
              </form>
              <div className="mt-1 flex justify-end">
                <Button type="button" variant="ghost" size="sm" disabled={pending || index === 0} aria-label={"Move " + step.label + " up"} onClick={() => reorder(index, -1)}><ArrowUp className="size-4" /></Button>
                <Button type="button" variant="ghost" size="sm" disabled={pending || index === steps.length - 1} aria-label={"Move " + step.label + " down"} onClick={() => reorder(index, 1)}><ArrowDown className="size-4" /></Button>
                <Button type="button" variant="ghost" size="sm" disabled={pending} aria-label={"Remove " + step.label} onClick={() => change({ operation: "checklist", kind: "delete", id: step.id })}><Trash2 className="size-4" /></Button>
              </div>
            </li>
          ) : (
            <li key={step.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-[0.9375rem] leading-6">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={step.is_completed}
                  disabled={pending}
                  onChange={(event) => change({ operation: "checklist", kind: "update", id: step.id, completed: event.target.checked })}
                />
                <span aria-hidden="true" className={cn(
                  "grid size-[1.375rem] shrink-0 place-items-center rounded-[0.375rem] border transition-colors duration-150 motion-reduce:transition-none",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  step.is_completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/60",
                )}>
                  {step.is_completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                <span className={cn("min-w-0 break-words", step.is_completed && "text-muted-foreground line-through decoration-muted-foreground/60")}>{step.label}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-[0.9375rem] leading-6 text-muted-foreground">Nothing to do yet. A short list helps you arrive relaxed.</p>
      )}

      {adding ? (
        <form method="post" className="mt-1 flex gap-2" onSubmit={(event) => { event.preventDefault(); change({ operation: "checklist", kind: "add", label: newStep }); }}>
          <label htmlFor="new-step" className="sr-only">Next little step</label>
          <Input id="new-step" autoFocus value={newStep} onChange={(event) => setNewStep(event.target.value)} maxLength={240} required placeholder="Book a table, pack a picnic…" className="min-w-0 flex-1" />
          <Button className="shrink-0" disabled={pending || steps.length >= 50}>Add step</Button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-x-5">
        <button type="button" className={quiet} onClick={() => setAdding((value) => !value)} aria-expanded={adding}>
          {adding ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}{adding ? "Close" : "Add a step"}
        </button>
        {steps.length ? (
          <button type="button" className={cn(quiet, "text-muted-foreground hover:text-foreground")} onClick={() => setEditing((value) => !value)} aria-pressed={editing}>
            {editing ? "Done editing" : "Edit steps"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Reminders({ planStarts, planned, reminders, timezone, now, pending, change, preview }: {
  planStarts: string; planned: boolean; reminders: Reminder[]; timezone: string; now: Date; pending: boolean; change: Change; preview: boolean;
}) {
  const choices = reminderChoices.filter((minutes) => !reminders.some((reminder) => reminder.offset_minutes === minutes) && Date.parse(planStarts) - minutes * 60_000 > now.getTime());
  const states: Record<string, string> = { sent: " · Sent", cancelled: " · Off" };
  return (
    <section aria-labelledby="reminders-title" className="flex flex-col">
      <h2 id="reminders-title" className={heading}>{reminders.length > 1 ? "Reminders" : "Reminder"}</h2>
      {reminders.length ? (
        <ul className="flex flex-col">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="flex min-h-[4.25rem] items-center gap-3 border-b border-border py-3 last:border-0">
              <Dot icon={Bell} />
              <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                <span className="text-[1.0625rem] font-semibold leading-[1.35]">{reminderWhen(reminder.due_at, timezone, now)}</span>
                <span className="text-[0.8125rem] leading-5 text-muted-foreground">{reminderLabel(reminder.offset_minutes)}{states[reminder.state] ?? ""}</span>
              </span>
              {["pending", "cancelled"].includes(reminder.state) ? (
                <Button type="button" variant="ghost" size="sm" disabled={pending} aria-label={"Remove reminder, " + reminderLabel(reminder.offset_minutes)} onClick={() => change({ operation: "reminder", kind: "delete", id: reminder.id })}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1 text-[0.9375rem] leading-6 text-muted-foreground">No reminder yet.</p>
      )}
      {planned && choices.length && reminders.length < 5 ? (
        <form method="post" className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); change({ operation: "reminder", kind: "add", minutes: Number(new FormData(event.currentTarget).get("minutes")) }); }}>
          <label htmlFor="reminder-time" className="sr-only">Remind us</label>
          <select id="reminder-time" name="minutes" defaultValue={choices.includes(1440) ? 1440 : choices[0]} className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-field px-3 text-[0.9375rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {choices.map((minutes) => <option key={minutes} value={minutes}>{reminderLabel(minutes)}</option>)}
          </select>
          <Button variant="outline" className="shrink-0" disabled={pending}>Add reminder</Button>
        </form>
      ) : null}
      <p className="mt-2 text-[0.8125rem] leading-5 text-muted-foreground">
        {preview ? "Reminders are delivered only for connected accounts." : "Each of you with plan notifications on gets them in your inbox."}
      </p>
    </section>
  );
}

function Attachments({ planId, attachments, preview }: { planId: string; attachments: PlanDetail["attachments"]; preview: boolean }) {
  const router = useRouter();
  const [state, action, uploading] = useActionState(uploadPlanAttachment, initialActionState);
  const kinds: Record<string, string> = { "application/pdf": "PDF", "image/png": "PNG", "image/jpeg": "JPEG" };
  const size = (bytes: number) => bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + " MB" : Math.ceil(bytes / 1024) + " KB";

  return (
    <section aria-labelledby="attachments-title" className="flex flex-col">
      <h2 id="attachments-title" className={heading}>Attachments</h2>
      {attachments.length ? (
        <ul className="flex flex-col">
          {attachments.map((file) => {
            const words = (
              <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                <span className="break-all text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{file.filename}</span>
                <span className="text-[0.8125rem] leading-5 text-muted-foreground">{file.ready ? "" : "Unfinished upload · "}{kinds[file.mime_type] ?? "File"} · {size(file.size_bytes)}</span>
              </span>
            );
            return (
              <li key={file.id} className="flex min-h-[4.25rem] items-center gap-2 border-b border-border py-3 last:border-0">
                {file.ready ? (
                  <a href={"/api/plan-attachments/" + file.id} className="group flex min-w-0 flex-1 items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <Dot icon={FileText} />{words}
                  </a>
                ) : <span className="flex min-w-0 flex-1 items-center gap-3"><Dot icon={FileText} />{words}</span>}
                <ConfirmDelete
                  variant="ghost"
                  size="sm"
                  label="Remove"
                  title="Remove this file?"
                  description={<><strong className="font-semibold text-foreground">“{file.filename}”</strong> is deleted from this plan for both of you.</>}
                  onConfirm={async () => {
                    const result = await deletePlanAttachment({ id: file.id, planId });
                    if (!result.ok) return result.message;
                    router.refresh();
                  }}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
      {preview ? (
        <p className="py-1 text-[0.9375rem] leading-6 text-muted-foreground">Tickets and bookings can be attached with your connected account.</p>
      ) : attachments.length < 20 ? (
        <form action={action} className="mt-1 flex flex-col gap-1">
          <input type="hidden" name="planId" value={planId} />
          <label className={cn(quiet, "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring", uploading && "pointer-events-none opacity-60")}>
            <Paperclip className="size-4" aria-hidden="true" />{uploading ? "Adding…" : "Add a file"}
            <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required className="sr-only" onChange={(event) => event.currentTarget.form?.requestSubmit()} />
          </label>
          <span className="text-[0.8125rem] leading-5 text-muted-foreground">PDF, PNG or JPEG up to 2 MB. Only the two of you can open them.</span>
          {state.message ? <p role="status" className={state.status === "error" ? "field-error" : "text-sm text-success"}>{state.message}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
