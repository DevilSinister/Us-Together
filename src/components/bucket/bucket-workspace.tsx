"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Plus, Settings2, SlidersHorizontal, Trash2, X } from "lucide-react";
import { filterBucketItems, mutateBucket } from "@/app/actions/bucket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_BUCKET_CATEGORIES, bucketPriorities, bucketStatuses, type BucketFilter, type BucketList, type BucketPage } from "@/lib/bucket/schema";

export const bucketFieldClass =
  "min-h-12 w-full min-w-0 rounded-lg border border-border bg-field px-3 py-2 text-base font-normal sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function bucketLabel(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const initialFilter: BucketFilter = { listId: "", status: "", priority: "", category: "", before: null };
type OptionsView = "options" | "create" | "manage";

export function BucketWorkspace({ lists, initialPage, categories = DEFAULT_BUCKET_CATEGORIES }: {
  lists: BucketList[];
  initialPage: BucketPage;
  categories?: readonly string[];
}) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [filter, setFilter] = useState(initialFilter);
  const [draft, setDraft] = useState(initialFilter);
  const [message, setMessage] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<OptionsView>("options");
  const activeList = lists.find((list) => list.id === filter.listId);
  const selectedList = lists.find((list) => list.id === draft.listId);
  const allCategories = Array.from(new Set([...categories, ...DEFAULT_BUCKET_CATEGORIES, filter.category])).filter(Boolean);
  const hasFilters = Boolean(filter.listId || filter.status || filter.priority || filter.category);

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

  function listAction(form: FormData) {
    start(async () => {
      setDialogMessage("");
      try {
        const result = await mutateBucket(Object.fromEntries(form));
        setDialogMessage(result.message);
        if (!result.ok) return;
        if (form.get("operation") === "createList" && result.id) {
          setDraft({ ...initialFilter, listId: result.id });
        }
        if (form.get("operation") === "deleteList") {
          setDraft(initialFilter);
          search(initialFilter);
        }
        setView("options");
        router.refresh();
      } catch {
        setDialogMessage("Connection interrupted. Check your lists before retrying the change.");
      }
    });
  }

  return (
    <div>
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Someday starts here</p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.03em] sm:text-5xl">Our bucket lists.</h1>
          <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">Keep the idea. Take a little step. Make it a day to remember.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {lists.length ? <Button asChild className="flex-1 sm:flex-none"><Link href="/bucket/new"><Plus className="size-4" />Add an idea</Link></Button> : null}
          <Button variant="outline" onClick={() => showOptions()}><SlidersHorizontal className="size-4" />Options</Button>
        </div>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={view === "options" ? "Lists and options" : view === "create" ? "Create new list" : "Manage this list"} className="max-w-xl" dismissible={!pending}>
          {view !== "options" ? <Button type="button" variant="ghost" className="-ml-3 mb-2" disabled={pending} onClick={() => changeView("options")}><ArrowLeft className="size-4" />Back to options</Button> : null}
          <DialogHeader>
            <DialogTitle>{view === "options" ? "Lists & options" : view === "create" ? "Create new list" : "Manage this list"}</DialogTitle>
            <DialogDescription>{view === "options" ? "Choose a list, then narrow it down to the ideas on your mind." : view === "create" ? "A theme, a season, or a place you've been dreaming of." : `Make a little room for what's next in “${selectedList?.title ?? "your list"}”.`}</DialogDescription>
          </DialogHeader>

          {view === "options" ? (
            <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); search({ ...draft, before: null }, true); }}>
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2">
                  <label htmlFor="bucket-list-filter" className="text-sm font-semibold">Browse a list</label>
                  <Button type="button" variant="ghost" className="-mr-3 text-primary" disabled={pending} onClick={() => changeView("create")}><Plus className="size-4" />New list</Button>
                </div>
                <select id="bucket-list-filter" className={bucketFieldClass} value={draft.listId} disabled={pending} onChange={(event) => setDraft({ ...draft, listId: event.target.value })}>
                  <option value="">All lists</option>
                  {lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
                </select>
                {selectedList ? <Button type="button" variant="ghost" className="-ml-3 mt-1 text-muted-foreground" disabled={pending} onClick={() => changeView("manage")}><Settings2 className="size-4" />Manage this list</Button> : null}
              </div>
              <fieldset className="border-t border-border pt-5">
                <legend className="sr-only">Filter ideas</legend>
                <div className="grid gap-4 min-[360px]:grid-cols-2">
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
                  <label className="block space-y-2 text-sm font-semibold min-[360px]:col-span-2">Category
                    <select aria-label="Category" className={bucketFieldClass} value={draft.category} disabled={pending} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                      <option value="">Any category</option>
                      {allCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>
              <p role="status" className="text-sm leading-6 text-primary">{dialogMessage}</p>
              <DialogFooter className="justify-between">
                <Button type="button" variant="ghost" disabled={pending || !Boolean(draft.listId || draft.status || draft.priority || draft.category)} onClick={() => setDraft(initialFilter)}>Reset all</Button>
                <Button disabled={pending}>{pending ? "Applying…" : "Apply filters"}</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="mt-5 space-y-6" key={view}>
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); listAction(new FormData(event.currentTarget)); }}>
                <input type="hidden" name="operation" value={view === "create" ? "createList" : "renameList"} />
                {view === "manage" ? <input type="hidden" name="id" value={draft.listId} /> : null}
                <label className="block space-y-2 text-sm font-semibold">List name
                  <Input name="title" required maxLength={120} defaultValue={view === "manage" ? selectedList?.title : ""} placeholder="Someday, together" autoFocus disabled={pending} />
                </label>
                <Button disabled={pending}>{pending ? "Saving…" : view === "create" ? "Create list" : "Rename list"}</Button>
              </form>
              {view === "manage" ? (
                <form className="space-y-4 border-t border-border pt-5" onSubmit={(event) => { event.preventDefault(); listAction(new FormData(event.currentTarget)); }}>
                  <div><h3 className="text-sm font-semibold">Delete this list</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Only empty lists can be deleted. Move or delete their ideas first.</p></div>
                  <input type="hidden" name="operation" value="deleteList" /><input type="hidden" name="id" value={draft.listId} />
                  <label className="block space-y-2 text-sm font-semibold">Type DELETE to confirm<Input name="confirmation" required pattern="DELETE" placeholder="DELETE" disabled={pending} /></label>
                  <Button variant="outline" className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" disabled={pending}><Trash2 className="size-4" />Delete empty list</Button>
                </form>
              ) : null}
              <p role="status" className="text-sm leading-6 text-primary">{dialogMessage}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section aria-label="Bucket ideas" className="mt-5 min-w-0">
        {lists.length ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 break-words text-sm font-semibold">{activeList?.title ?? "All lists"}<span className="ml-2 font-normal text-muted-foreground">· {page.items.length}{page.next ? "+" : ""} {page.items.length === 1 ? "idea" : "ideas"}{filter.before ? " on this page" : ""}</span></p>
            {hasFilters ? <Button variant="ghost" disabled={pending} onClick={() => search(initialFilter)}>Reset view</Button> : null}
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
          <ul className="divide-y divide-border" aria-busy={pending}>
            {page.items.map((item) => (
              <li key={item.id} className="py-6 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-medium leading-5 text-muted-foreground">{lists.find((list) => list.id === item.list_id)?.title} · {bucketLabel(item.status)} · {bucketLabel(item.priority)} priority</p>
                    <h2 className="mt-2 break-words font-display text-2xl sm:text-3xl"><Link className="text-foreground underline-offset-4 hover:underline" href={`/bucket/${item.id}`}>{item.title}</Link></h2>
                    {item.description ? <p className="mt-2.5 line-clamp-2 max-w-prose break-words text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                    {item.category || item.target_date ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      {item.category ? <span className="max-w-full break-words rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">{item.category}</span> : null}
                      {item.target_date ? <span>By {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item.target_date}T12:00:00Z`))}</span> : null}
                    </div> : null}
                  </div>
                  <Link href={`/bucket/${item.id}`} aria-label={`Open ${item.title}`} className="grid size-11 shrink-0 place-items-center rounded-lg text-primary hover:bg-secondary"><ArrowRight className="size-5" /></Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <h2 className="font-display text-2xl sm:text-3xl">{lists.length ? "Room for your next idea." : "What would you love to do together?"}</h2>
            <p className="mx-auto mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{lists.length ? "No ideas match this view. Try another filter, or add something you've been talking about." : "Make a list first. It can hold a weekend ritual, a faraway place, or a small adventure close to home."}</p>
            {lists.length ? <Button asChild className="mt-6"><Link href="/bucket/new">Add an idea</Link></Button> : <Button className="mt-6" onClick={() => showOptions("create")}><Plus className="size-4" />Create your first list</Button>}
          </div>
        )}
        {filter.before || page.next ? <div className="mt-6 flex gap-3">
          {filter.before ? <Button variant="ghost" onClick={() => search({ ...filter, before: null })} disabled={pending}>Back to first page</Button> : null}
          {page.next ? <Button variant="outline" disabled={pending} onClick={() => search({ ...filter, before: page.next })}>Next ideas</Button> : null}
        </div> : null}
      </section>
    </div>
  );
}
