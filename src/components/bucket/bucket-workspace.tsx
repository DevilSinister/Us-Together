"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { filterBucketItems, mutateBucket } from "@/app/actions/bucket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bucketPriorities, bucketStatuses, type BucketFilter, type BucketList, type BucketPage } from "@/lib/bucket/schema";

export const bucketFieldClass = "min-h-12 w-full min-w-0 rounded-lg border bg-field px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const initialFilter: BucketFilter = { listId: "", status: "", priority: "", category: "", before: null };
export function BucketWorkspace({ lists, initialPage }: { lists: BucketList[]; initialPage: BucketPage }) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [filter, setFilter] = useState(initialFilter);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  function search(next: BucketFilter) {
    start(async () => {
      try { setMessage(""); const result = await filterBucketItems(next); if (result.page) { setPage(result.page); setFilter(next); } else setMessage(result.error!); }
      catch { setMessage("Connection interrupted. Your filters are unchanged. Try again when you are online."); }
    });
  }
  async function listAction(form: FormData) {
    try {
      const result = await mutateBucket(Object.fromEntries(form));
      setMessage(result.message);
      if (result.ok) { if (form.get("operation") === "deleteList") search(initialFilter); router.refresh(); }
    } catch { setMessage("Connection interrupted. Check your lists before retrying the change."); }
  }
  return <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="space-y-6">
      <div><h2 className="font-display text-2xl">Your lists</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A place for the little things and the once-in-a-lifetime ones.</p></div>
      <label className="block space-y-2 text-sm font-semibold">Browse a list<select className={bucketFieldClass} value={filter.listId} onChange={(event) => search({ ...filter, listId: event.target.value, before: null })} disabled={pending}><option value="">All lists</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select></label>
      <details className="border-t pt-5"><summary className="min-h-11 cursor-pointer font-semibold text-primary">New list</summary><form action={(form) => start(() => listAction(form))} className="space-y-3"><input type="hidden" name="operation" value="createList" /><label className="block space-y-2 text-sm">List name<Input name="title" required maxLength={120} placeholder="Someday, together" /></label><Button disabled={pending} variant="outline" className="w-full"><Plus className="size-4" />Create list</Button></form></details>
      {filter.listId ? <details className="border-t pt-5"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Manage this list</summary><form action={(form) => start(() => listAction(form))} className="space-y-3"><input type="hidden" name="operation" value="renameList" /><input type="hidden" name="id" value={filter.listId} /><label className="block text-sm">List name<Input key={filter.listId} name="title" required maxLength={120} defaultValue={lists.find((list) => list.id === filter.listId)?.title} /></label><Button disabled={pending} variant="outline">Rename list</Button></form><form className="mt-6 space-y-3" action={(form) => start(() => listAction(form))}><input type="hidden" name="operation" value="deleteList" /><input type="hidden" name="id" value={filter.listId} /><p className="text-sm leading-6 text-muted-foreground">Only empty lists can be deleted. Move or delete their ideas first.</p><label className="block text-sm">Type DELETE to confirm<Input name="confirmation" required pattern="DELETE" /></label><Button disabled={pending} variant="outline">Delete empty list</Button></form></details> : null}
      <p className="text-sm leading-6 text-muted-foreground">Shared with your active partner. You can start adding ideas before they join.</p>
    </aside>
    <section aria-label="Bucket ideas" className="min-w-0">
      <form className="grid gap-3 border-b pb-6 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); search({ ...filter, status: String(fields.get("status")) as BucketFilter["status"], priority: String(fields.get("priority")) as BucketFilter["priority"], category: String(fields.get("category")), before: null }); }}>
        <label className="space-y-2 text-sm font-semibold">Status<select aria-label="Status" name="status" className={bucketFieldClass} defaultValue=""><option value="">Any status</option>{bucketStatuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label className="space-y-2 text-sm font-semibold">Priority<select aria-label="Priority" name="priority" className={bucketFieldClass} defaultValue=""><option value="">Any priority</option>{bucketPriorities.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="space-y-2 text-sm font-semibold">Category<Input name="category" maxLength={80} placeholder="Exact category" /></label><Button className="self-end" variant="outline" disabled={pending}>Apply filters</Button>
      </form>
      <p role="status" className="my-4 min-h-6 text-sm text-primary">{pending ? "Updating your ideas…" : message}</p>
      {page.items.length ? <ul className="divide-y" aria-busy={pending}>{page.items.map((item) => <li key={item.id} className="py-6 first:pt-0"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{lists.find((list) => list.id === item.list_id)?.title} · {item.status.replaceAll("_", " ")} · {item.priority} priority</p><h2 className="mt-2 break-words font-display text-3xl"><Link className="hover:underline" href={`/bucket/${item.id}`}>{item.title}</Link></h2>{item.description ? <p className="mt-3 line-clamp-2 max-w-prose break-words leading-7 text-muted-foreground">{item.description}</p> : null}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{item.category ? <span>{item.category}</span> : null}{item.target_date ? <span>By {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item.target_date}T12:00:00Z`))}</span> : null}</div></div><Link href={`/bucket/${item.id}`} aria-label={`Open ${item.title}`} className="grid size-11 shrink-0 place-items-center rounded-lg text-primary hover:bg-secondary"><ArrowRight className="size-5" /></Link></div></li>)}</ul> : <div className="py-10"><h2 className="font-display text-3xl">{lists.length ? "Room for your next idea." : "What would you love to do together?"}</h2><p className="mt-4 max-w-prose leading-7 text-muted-foreground">{lists.length ? "No ideas match this view. Try another filter, or add something you've been talking about." : "Make a list first. It can hold a weekend ritual, a faraway place, or a small adventure close to home."}</p>{lists.length ? <Button asChild className="mt-6"><Link href="/bucket/new">Add an idea</Link></Button> : null}</div>}
      <div className="mt-6 flex gap-3">{filter.before ? <Button variant="ghost" onClick={() => search({ ...filter, before: null })} disabled={pending}>Back to first page</Button> : null}{page.next ? <Button variant="outline" disabled={pending} onClick={() => search({ ...filter, before: page.next })}>Next ideas</Button> : null}</div>
    </section>
  </div>;
}
