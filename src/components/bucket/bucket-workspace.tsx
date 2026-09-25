"use client";
import { usePartnerRefresh } from "@/components/providers/partner-sync";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, CircleCheck, Footprints, ListTree, Plus, Settings2, SlidersHorizontal, Sparkles, Tag, X, type LucideIcon } from "lucide-react";
import { filterBucketItems, mutateBucket } from "@/app/actions/bucket";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { refreshWindow } from "@/lib/partner-sync";
import { bucketGroupingLabels, bucketGroupings, categoryMark, groupBucketItems, NO_CATEGORY, type BucketGrouping } from "@/lib/bucket/grouping";
import { cn } from "@/lib/utils";
import { categoryIcons, IdeaTile } from "./idea-tile";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { DEFAULT_BUCKET_CATEGORIES, bucketPriorities, bucketStatuses, type BucketFilter, type BucketList, type BucketPage } from "@/lib/bucket/schema";

export const bucketFieldClass =
  "min-h-12 w-full min-w-0 rounded-control border border-border bg-field px-3 py-2 text-base font-normal sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function bucketLabel(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const statusIcons: Record<string, LucideIcon> = { in_progress: Footprints, planned: CalendarDays, idea: Sparkles, completed: CircleCheck };

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
type OptionsView = "options" | "create" | "manage";

export function BucketWorkspace({ lists, initialPage, listId = "", categories = DEFAULT_BUCKET_CATEGORIES }: {
  lists: BucketList[];
  initialPage: BucketPage;
  listId?: string;
  categories?: readonly string[];
}) {
  const router = useRouter();
  const listFilter = { ...initialFilter, listId };
  const [page, setPage] = useState(initialPage);
  const [filter, setFilter] = useState(listFilter);
  const [draft, setDraft] = useState(listFilter);
  const [message, setMessage] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<OptionsView>("options");
  const activeList = lists.find((list) => list.id === filter.listId);
  const selectedList = lists.find((list) => list.id === draft.listId);
  const allCategories = Array.from(new Set([...categories, ...DEFAULT_BUCKET_CATEGORIES, filter.category])).filter(Boolean);
  const hasFilters = Boolean(filter.status || filter.priority || filter.category);
  const grouping = useSyncExternalStore(subscribeGrouping, readGrouping, () => "status" as const);
  const groups = groupBucketItems(page.items, grouping);

  usePartnerRefresh(async () => {
    if (!listId) return;
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

  function changeView(next: OptionsView) {
    setDialogMessage("");
    setView(next);
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

  function listAction(form: FormData) {
    start(async () => {
      setDialogMessage("");
      try {
        const result = await mutateBucket(Object.fromEntries(form));
        setDialogMessage(result.message);
        if (!result.ok) return;
        setOpen(false);
        if (form.get("operation") === "deleteList") router.push("/bucket");
        router.refresh();
      } catch {
        setDialogMessage("Connection interrupted. Check your lists before retrying the change.");
      }
    });
  }

  return (
    <div>
      <PageHeader
        scale="compact"
        eyebrow="Someday starts here"
        title={activeList?.title ?? "Our bucket lists."}
        lede={listId ? "Keep the idea. Take a little step. Make it a day to remember." : "A place for every kind of someday. Open a list to explore your ideas."}
        back={listId ? <InlineLink href="/bucket"><ArrowLeft className="size-4" />All lists</InlineLink> : null}
        actions={listId ? <>
          <Button asChild><Link href={`/bucket/new?list=${listId}`}><Plus className="size-4" />Add idea</Link></Button>
          <Button variant="outline" onClick={() => showOptions()}><SlidersHorizontal className="size-4" />Options</Button>
          {/* A native select under a button face: the phone's own picker, full keyboard support. */}
          <label className={cn(buttonVariants({ variant: "outline" }), "relative cursor-pointer pr-10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2")}>
            <ListTree className="size-4" aria-hidden="true" />
            <span aria-hidden="true">Organize <span className="font-normal text-muted-foreground">by {bucketGroupingLabels[grouping].toLowerCase()}</span></span>
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
        </> : <Button onClick={() => showOptions("create")}><Plus className="size-4" />Add list</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={view === "options" ? "List options" : view === "create" ? "Create new list" : "Manage this list"} className="max-w-xl" dismissible={!pending}>
          {view !== "options" && listId ? <Button type="button" variant="ghost" className="-ml-3 mb-2" disabled={pending} onClick={() => changeView("options")}><ArrowLeft className="size-4" />Back to options</Button> : null}
          <DialogHeader>
            <DialogTitle>{view === "options" ? "List options" : view === "create" ? "Create new list" : "Manage this list"}</DialogTitle>
            <DialogDescription>{view === "options" ? "Narrow this list down to the ideas on your mind." : view === "create" ? "A theme, a season, or a place you've been dreaming of." : `Make a little room for what's next in “${selectedList?.title ?? "your list"}”.`}</DialogDescription>
          </DialogHeader>

          {view === "options" ? (
            <form method="post" className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); search({ ...draft, before: null }, true); }}>
              <Button type="button" variant="ghost" className="-ml-3 text-muted-foreground" disabled={pending} onClick={() => changeView("manage")}><Settings2 className="size-4" />Manage this list</Button>
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
            <div className="mt-5 space-y-6" key={view}>
              <form method="post" className="space-y-4" onSubmit={(event) => { event.preventDefault(); listAction(new FormData(event.currentTarget)); }}>
                <input type="hidden" name="operation" value={view === "create" ? "createList" : "renameList"} />
                {view === "manage" ? <input type="hidden" name="id" value={draft.listId} /> : null}
                <label className="block space-y-2 text-sm font-semibold">List name
                  <Input name="title" required maxLength={120} defaultValue={view === "manage" ? selectedList?.title : ""} placeholder="Someday, together" autoFocus disabled={pending} />
                </label>
                <Button disabled={pending}>{pending ? "Saving…" : view === "create" ? "Create list" : "Rename list"}</Button>
              </form>
              {view === "manage" ? (
                <div className="space-y-4 border-t border-border pt-5">
                  <div><h3 className="text-sm font-semibold">Delete this list</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Only empty lists can be deleted. Move or delete their ideas first.</p></div>
                  <ConfirmDelete
                    label="Delete list"
                    title="Delete this list?"
                    description={<><strong className="font-semibold text-foreground">“{selectedList?.title ?? "This list"}”</strong> is removed for both of you. Only an empty list can go.</>}
                    blocked={page.items.length && !hasFilters ? "This list still holds ideas. Move or delete them first." : null}
                    leavesPage
                    onConfirm={async () => {
                      const result = await mutateBucket({ operation: "deleteList", id: draft.listId, confirmation: "DELETE" });
                      if (!result.ok) return result.message;
                      setOpen(false);
                      router.push("/bucket");
                      router.refresh();
                    }}
                  />
                </div>
              ) : null}
              <p role="status" className="text-sm leading-6 text-primary">{dialogMessage}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!listId ? <section aria-label="Bucket lists" className="mt-6">
        {lists.length ? <ul className="divide-y divide-border">
          {lists.map((list) => <li key={list.id}>
            <Link href={`/bucket/lists/${list.id}`} className="group flex min-h-24 items-center justify-between gap-4 rounded-lg px-3 py-5 hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-ring">
              <div className="min-w-0"><h2 className="break-words font-display text-2xl sm:text-3xl">{list.title}</h2><p className="mt-2 text-sm text-muted-foreground">Open ideas</p></div>
              <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
            </Link>
          </li>)}
        </ul> : <div className="rounded-panel border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl">What would you love to do together?</h2>
          <p className="mx-auto mt-3 max-w-prose text-sm leading-6 text-muted-foreground">Add your first list for a weekend ritual, a faraway place, or a small adventure close to home.</p>
        </div>}
      </section> : <section aria-label="Bucket ideas" className="mt-5 min-w-0">
        {lists.length ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 break-words text-sm font-semibold">{activeList?.title ?? "All lists"}<span className="ml-2 font-normal text-muted-foreground">· {page.items.length}{page.next ? "+" : ""} {page.items.length === 1 ? "idea" : "ideas"}</span></p>
            {hasFilters ? <Button variant="ghost" disabled={pending} onClick={() => search(listFilter)}>Reset view</Button> : null}
            {filter.status || filter.priority || filter.category ? (
              <div className="flex w-full flex-wrap gap-2" aria-label="Active filters">
                {(["status", "priority", "category"] as const).filter((key) => filter[key]).map((key) => (
                  <button key={key} type="button" disabled={pending} aria-label={`Remove ${key} filter: ${bucketLabel(filter[key])}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" onClick={() => search({ ...filter, [key]: "", before: null })}><span className="break-words">{bucketLabel(filter[key])}</span><X className="size-4 shrink-0" /></button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <p role="status" aria-hidden={open || undefined} className={!open && (pending || message) ? "mb-5 text-sm leading-6 text-primary" : "sr-only"}>{!open ? pending ? "Updating your ideas…" : message : ""}</p>
        {page.items.length ? (
          <div className="space-y-9" aria-busy={pending}>
            {groups.map((group) => {
              const GroupIcon = grouping === "status" ? statusIcons[group.key] ?? Tag : grouping === "category" ? categoryIcons[categoryMark(group.key === NO_CATEGORY ? null : group.key)] : null;
              return (
                <section key={group.key} aria-labelledby={"group-" + group.key}>
                  <h2 id={"group-" + group.key} className="flex items-center gap-2 text-sm font-semibold text-primary">
                    {GroupIcon ? <GroupIcon className="size-4" aria-hidden="true" /> : null}
                    <span className="min-w-0 break-words">{group.label}</span>
                    <span className="font-normal text-muted-foreground">· {group.items.length}</span>
                  </h2>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {group.items.map((item) => <li key={item.id} className="min-w-0"><IdeaTile item={item} groupedBy={grouping} /></li>)}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-panel border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <h2 className="font-display text-2xl sm:text-3xl">{lists.length ? "Room for your next idea." : "What would you love to do together?"}</h2>
            <p className="mx-auto mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{lists.length ? "No ideas match this view. Try another filter, or add something you've been talking about." : "Make a list first. It can hold a weekend ritual, a faraway place, or a small adventure close to home."}</p>
            {lists.length ? <Button asChild className="mt-6"><Link href={`/bucket/new?list=${listId}`}>Add idea</Link></Button> : <Button className="mt-6" onClick={() => showOptions("create")}><Plus className="size-4" />Create your first list</Button>}
          </div>
        )}
        {/* Sections regroup as pages arrive, so more ideas append rather than replace. */}
        {page.next ? <Button className="mt-8" variant="outline" disabled={pending} onClick={loadMore}>{pending ? "Loading…" : "Load more ideas"}</Button> : null}
      </section>}
    </div>
  );
}
