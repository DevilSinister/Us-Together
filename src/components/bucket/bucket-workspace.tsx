"use client";
import { usePartnerRefresh } from "@/components/providers/partner-sync";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ListFilter, Plus, Settings2, SlidersHorizontal, X } from "lucide-react";
import { filterBucketItems, mutateBucket } from "@/app/actions/bucket";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import { refreshWindow } from "@/lib/partner-sync";
import { bucketGroupingLabels, bucketGroupings, categoryMark, groupBucketItems, priorityLevel, type BucketGrouping } from "@/lib/bucket/grouping";
import { cn } from "@/lib/utils";
import { categoryIcons } from "./category-icons";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_BUCKET_CATEGORIES, bucketPriorities, bucketStatuses, type BucketFilter, type BucketItem, type BucketList, type BucketPage } from "@/lib/bucket/schema";

export const bucketFieldClass =
  "min-h-12 w-full min-w-0 rounded-control border border-border bg-field px-3 py-2 text-base font-normal sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function bucketLabel(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// How a list is organized is a per-device preference, kept in this browser.
// An in-memory copy stands in when storage is blocked, so the control still works.
const GROUPING_KEY = "us-together:bucket-grouping";
const groupingListeners = new Set<() => void>();
let groupingFallback: BucketGrouping = "status";
function readGrouping(): BucketGrouping {
  try {
    const stored = window.localStorage.getItem(GROUPING_KEY);
    if (stored && (bucketGroupings as readonly string[]).includes(stored)) return stored as BucketGrouping;
  } catch { /* storage unavailable: use the in-memory choice */ }
  return groupingFallback;
}
function subscribeGrouping(listener: () => void) {
  groupingListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { groupingListeners.delete(listener); window.removeEventListener("storage", listener); };
}
function saveGrouping(next: BucketGrouping) {
  groupingFallback = next;
  try { window.localStorage.setItem(GROUPING_KEY, next); } catch { /* keep the in-memory choice */ }
  groupingListeners.forEach((listener) => listener());
}

const initialFilter: BucketFilter = { listId: "", status: "", priority: "", category: "", before: null };
const statusWords: Record<string, string> = { idea: "Idea", planned: "Planned", in_progress: "In progress", completed: "Lived" };
/** Rows shown in a section before "Show N more". */
const sectionPreview = 5;
const outline = "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border px-3.5 text-sm font-semibold transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 motion-reduce:transition-none";
type OptionsView = "options" | "manage";

/**
 * One bucket list as a Cover screen (ADR-053). The band names the list and
 * counts its dreams; under it, Organize (status, category or priority, kept
 * per device) and Options (filters, rename and delete). Ideas are ruled rows
 * in sections - In progress, Planned, Ideas, Lived - each row led by its
 * category mark, or a tick once lived, with a kicker that says only what the
 * section does not: how much you want it, by when, and when you lived it. A
 * section longer than five opens the rest on request.
 */
export function BucketWorkspace({ list, initialPage, summary, categories = DEFAULT_BUCKET_CATEGORIES }: {
  list: BucketList;
  initialPage: BucketPage;
  /** The whole list's counts, which the first page of ideas cannot give. */
  summary: { dreams: number; lived: number };
  categories?: readonly string[];
}) {
  const router = useRouter();
  const listFilter = { ...initialFilter, listId: list.id };
  const [page, setPage] = useState(initialPage);
  const [filter, setFilter] = useState(listFilter);
  const [draft, setDraft] = useState(listFilter);
  const [message, setMessage] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<OptionsView>("options");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const allCategories = Array.from(new Set([...categories, ...DEFAULT_BUCKET_CATEGORIES, filter.category])).filter(Boolean);
  const hasFilters = Boolean(filter.status || filter.priority || filter.category);
  const grouping = useSyncExternalStore(subscribeGrouping, readGrouping, () => "status" as const);
  const groups = groupBucketItems(page.items, grouping);
  const thisYear = String(new Date().getUTCFullYear());

  usePartnerRefresh(async () => {
    // Refresh every idea already on screen, not just the first page.
    const result = await refreshWindow<BucketPage["items"][number], string>(async (before) => {
      const response = await filterBucketItems({ ...filter, before });
      if (!response.page) throw Error("Refresh unavailable");
      return response.page;
    }, page.items.length);
    setPage(current => current === page ? result : current);
  }, pending || open);

  function showOptions(nextView: OptionsView = "options") {
    setDraft(filter);
    setDialogMessage("");
    setView(nextView);
    setOpen(true);
  }

  function search(next: BucketFilter, fromDialog = false) {
    start(async () => {
      const feedback = fromDialog ? setDialogMessage : setMessage;
      feedback("");
      try {
        const result = await filterBucketItems(next);
        if (result.page) {
          setPage(result.page);
          setFilter(next);
          setMessage("");
          if (fromDialog) setOpen(false);
        } else feedback(result.error ?? "We couldn't load this view. Try again.");
      } catch {
        feedback("Connection interrupted. Your filters are unchanged. Try again when you are online.");
      }
    });
  }

  function loadMore() {
    start(async () => {
      setMessage("");
      try {
        const result = await filterBucketItems({ ...filter, before: page.next });
        if (!result.page) { setMessage(result.error ?? "We couldn't load more ideas. Try again."); return; }
        const more = result.page;
        setPage((current) => ({ items: [...current.items, ...more.items.filter((item) => !current.items.some((old) => old.id === item.id))], next: more.next }));
      } catch {
        setMessage("Connection interrupted. The ideas above are unchanged. Try again when you are online.");
      }
    });
  }

  function rename(form: FormData) {
    start(async () => {
      setDialogMessage("");
      try {
        const result = await mutateBucket(Object.fromEntries(form));
        setDialogMessage(result.message);
        if (!result.ok) return;
        setOpen(false);
        router.refresh();
      } catch {
        setDialogMessage("Connection interrupted. Check your lists before retrying the change.");
      }
    });
  }

  function kicker(item: BucketItem) {
    const day = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: value.startsWith(thisYear) ? undefined : "numeric", timeZone: "UTC" }).format(new Date(value + "T12:00:00Z"));
    if (item.status === "completed") return item.lived_on ? "Lived " + day(item.lived_on) : "Lived";
    return [
      grouping !== "status" ? statusWords[item.status] ?? bucketLabel(item.status) : null,
      item.target_date ? "by " + day(item.target_date) : null,
    ].filter(Boolean).join(" · ");
  }

  return (
    <>
      <Cover
        labelledBy="list-title"
        height="band"
        back={{ href: "/bucket", label: "Back to bucket lists" }}
        action={<Button asChild><Link href={`/bucket/new?list=${list.id}`}><Plus className="size-4" aria-hidden="true" />Add idea</Link></Button>}
      >
        <p className="text-[0.8125rem] font-semibold text-primary">Bucket list</p>
        <h1 id="list-title" className="mt-1.5 text-balance break-words font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">{list.title}</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">
          {summary.dreams ? `${summary.dreams.toLocaleString("en")} ${summary.dreams === 1 ? "dream" : "dreams"} · ${summary.lived.toLocaleString("en")} lived` : "No dreams yet"}
        </p>
      </Cover>

      <CoverSheet>
        <div className="flex max-w-2xl flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {/* A native select under a button face: the phone's own picker, full keyboard support. */}
            <label className={cn(outline, "relative cursor-pointer pr-9 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring")}>
              <ListFilter className="size-4" aria-hidden="true" />
              <span aria-hidden="true">Organize: {bucketGroupingLabels[grouping]}</span>
              <select
                aria-label="Organize ideas by"
                value={grouping}
                onChange={(event) => saveGrouping(event.target.value as BucketGrouping)}
                className="absolute inset-0 cursor-pointer appearance-none rounded-control opacity-0"
              >
                {bucketGroupings.map((value) => <option key={value} value={value}>{bucketGroupingLabels[value]}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 size-4" aria-hidden="true" />
            </label>
            <button type="button" className={outline} onClick={() => showOptions()}><SlidersHorizontal className="size-4" aria-hidden="true" />Options</button>
          </div>

          {hasFilters ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              {(["status", "priority", "category"] as const).filter((key) => filter[key]).map((key) => (
                <button key={key} type="button" disabled={pending} aria-label={`Remove ${key} filter: ${bucketLabel(filter[key])}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-control bg-secondary px-3 text-sm font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" onClick={() => search({ ...filter, [key]: "", before: null })}>
                  <span className="break-words">{bucketLabel(filter[key])}</span><X className="size-4 shrink-0" aria-hidden="true" />
                </button>
              ))}
              <Button variant="ghost" disabled={pending} onClick={() => search(listFilter)}>Reset view</Button>
            </div>
          ) : null}

          <p role="status" aria-hidden={open || undefined} className={!open && (pending || message) ? "text-sm leading-6 text-primary" : "sr-only"}>{!open ? pending ? "Updating your ideas…" : message : ""}</p>

          {page.items.length ? (
            <div className="flex flex-col gap-6" aria-busy={pending}>
              {groups.map((group) => {
                const showAll = expanded.has(group.key);
                const shown = showAll ? group.items : group.items.slice(0, sectionPreview);
                const hidden = group.items.length - shown.length;
                return (
                  <section key={group.key} aria-labelledby={"group-" + group.key} className="flex flex-col">
                    <h2 id={"group-" + group.key} className="text-[0.8125rem] font-semibold text-primary">
                      <span className="break-words">{group.label}</span> · {group.items.length}
                    </h2>
                    <ul className="flex flex-col">
                      {shown.map((item) => <li key={item.id} className="border-b border-border last:border-0"><IdeaRow item={item} grouping={grouping} kicker={kicker(item)} /></li>)}
                    </ul>
                    {hidden > 0 ? (
                      <button type="button" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" onClick={() => setExpanded((current) => new Set(current).add(group.key))}>
                        Show {hidden} more {hidden === 1 ? "idea" : "ideas"}
                      </button>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-panel bg-secondary p-5">
              <h2 className="font-display text-[1.375rem] leading-[1.3]">{hasFilters ? "Nothing in this view." : "Room for your first dream."}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{hasFilters ? "Try another filter, or reset the view." : "Add something you keep talking about. One line is enough to start."}</p>
              {hasFilters ? <Button variant="outline" disabled={pending} onClick={() => search(listFilter)}>Reset view</Button> : <Button asChild><Link href={`/bucket/new?list=${list.id}`}><Plus className="size-4" aria-hidden="true" />Add idea</Link></Button>}
            </div>
          )}

          {/* Sections regroup as pages arrive, so more ideas append rather than replace. */}
          {page.next ? <Button className="self-start" variant="outline" disabled={pending} onClick={loadMore}>{pending ? "Loading…" : "Load more ideas"}</Button> : null}
        </div>
      </CoverSheet>

      <FloatingAction href={`/bucket/new?list=${list.id}`} label="Add an idea" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={view === "options" ? "List options" : "Manage this list"} className="max-w-xl" dismissible={!pending}>
          {view === "manage" ? <Button type="button" variant="ghost" className="-ml-3 mb-2" disabled={pending} onClick={() => { setDialogMessage(""); setView("options"); }}><ArrowLeft className="size-4" />Back to options</Button> : null}
          <DialogHeader>
            <DialogTitle>{view === "options" ? "List options" : "Manage this list"}</DialogTitle>
            <DialogDescription>{view === "options" ? "Narrow this list down to the ideas on your mind." : `Rename “${list.title}”, or let it go once it is empty.`}</DialogDescription>
          </DialogHeader>

          {view === "options" ? (
            <form method="post" className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); search({ ...draft, before: null }, true); }}>
              <Button type="button" variant="ghost" className="-ml-3 text-muted-foreground" disabled={pending} onClick={() => { setDialogMessage(""); setView("manage"); }}><Settings2 className="size-4" />Manage this list</Button>
              <fieldset className="border-t border-border pt-5">
                <legend className="sr-only">Filter ideas</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold">Status
                    <select aria-label="Status" className={bucketFieldClass} value={draft.status} disabled={pending} onChange={(event) => setDraft({ ...draft, status: event.target.value as BucketFilter["status"] })}>
                      <option value="">Any status</option>
                      {bucketStatuses.map((value) => <option key={value} value={value}>{bucketLabel(value)}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm font-semibold">Priority
                    <select aria-label="Priority" className={bucketFieldClass} value={draft.priority} disabled={pending} onChange={(event) => setDraft({ ...draft, priority: event.target.value as BucketFilter["priority"] })}>
                      <option value="">Any priority</option>
                      {bucketPriorities.map((value) => <option key={value} value={value}>{bucketLabel(value)}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm font-semibold sm:col-span-2">Category
                    <select aria-label="Category" className={bucketFieldClass} value={draft.category} disabled={pending} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                      <option value="">Any category</option>
                      {allCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>
              <p role="status" className="text-sm leading-6 text-primary">{dialogMessage}</p>
              <DialogFooter className="justify-between">
                <Button type="button" variant="ghost" disabled={pending || !Boolean(draft.status || draft.priority || draft.category)} onClick={() => setDraft(listFilter)}>Reset all</Button>
                <Button disabled={pending}>{pending ? "Applying…" : "Apply filters"}</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="mt-5 space-y-6">
              <form method="post" className="space-y-4" onSubmit={(event) => { event.preventDefault(); rename(new FormData(event.currentTarget)); }}>
                <input type="hidden" name="operation" value="renameList" />
                <input type="hidden" name="id" value={list.id} />
                <label className="block space-y-2 text-sm font-semibold">List name
                  <Input name="title" required maxLength={120} defaultValue={list.title} autoFocus disabled={pending} />
                </label>
                <Button disabled={pending}>{pending ? "Saving…" : "Rename list"}</Button>
              </form>
              <div className="space-y-4 border-t border-border pt-5">
                <div><h3 className="text-sm font-semibold">Delete this list</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Only empty lists can be deleted. Move or delete their ideas first.</p></div>
                <ConfirmDelete
                  label="Delete list"
                  title="Delete this list?"
                  description={<><strong className="font-semibold text-foreground">“{list.title}”</strong> is removed for both of you. Only an empty list can go.</>}
                  blocked={summary.dreams ? "This list still holds ideas. Move or delete them first." : null}
                  leavesPage
                  onConfirm={async () => {
                    const result = await mutateBucket({ operation: "deleteList", id: list.id, confirmation: "DELETE" });
                    if (!result.ok) return result.message;
                    setOpen(false);
                    router.push("/bucket");
                    router.refresh();
                  }}
                />
              </div>
              <p role="status" className="text-sm leading-6 text-primary">{dialogMessage}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * One idea on the list: its category mark (a tick once lived), a kicker, the
 * title, and a chevron. How much you want it is a four-mark meter beside the
 * priority word, unless the list is organized by priority already.
 */
function IdeaRow({ item, grouping, kicker }: { item: BucketItem; grouping: BucketGrouping; kicker: string }) {
  const done = item.status === "completed";
  const Icon = categoryIcons[categoryMark(item.category)];
  const level = priorityLevel(item.priority);
  const meter = !done && grouping !== "priority";
  return (
    <Link href={`/bucket/${item.id}`} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-secondary", done && "text-success")}>
        {done ? <Check className="size-5" aria-hidden="true" /> : <Icon className="size-5" aria-hidden="true" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
        <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{item.title}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-[0.8125rem] leading-5 text-muted-foreground">
          {/* The mark already shows the category; a screen reader hears it here. */}
          {item.category && grouping !== "category" ? <span className="sr-only">{item.category}, </span> : null}
          {meter ? (
            <span className="inline-flex items-center gap-2">
              <span className="flex gap-[3px]" aria-hidden="true">
                {[1, 2, 3, 4].map((mark) => <span key={mark} className={cn("size-1.5 rounded-full", mark <= level ? "bg-rose" : "bg-border")} />)}
              </span>
              {bucketLabel(item.priority)}<span className="sr-only"> priority</span>
            </span>
          ) : null}
          {meter && kicker ? <span aria-hidden="true">·</span> : null}
          {kicker ? <span className="min-w-0 break-words">{kicker}</span> : null}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
