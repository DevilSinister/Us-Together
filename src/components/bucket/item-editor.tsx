"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutateBucket } from "@/app/actions/bucket";
import { bucketPriorities, bucketStatuses, type BucketItem, type BucketList } from "@/lib/bucket/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bucketFieldClass } from "./bucket-workspace";

export function ItemEditor({ lists, item }: { lists: BucketList[]; item?: BucketItem }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [pending, start] = useTransition();
  return <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); start(async () => { try { const result = await mutateBucket({ operation: item ? "updateItem" : "createItem", id: item?.id, version: item?.version, item: values }); setMessage(result.message); if (result.ok) { if (!item) router.push(`/bucket/${result.id}`); else router.refresh(); } } catch { setMessage("Connection interrupted. Your form is kept here; check your ideas before retrying."); } }); }}>
    <label className="block space-y-2 font-semibold">What would you love to do?<Input name="title" required maxLength={160} defaultValue={item?.title} /></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold">List<select aria-label="List" name="listId" className={bucketFieldClass} defaultValue={item?.list_id ?? lists[0]?.id} required>{lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}</select></label><label className="space-y-2 text-sm font-semibold">Category <span className="font-normal">optional</span><Input name="category" maxLength={80} defaultValue={item?.category ?? ""} placeholder="Travel, food, little rituals…" /></label></div>
    <label className="block space-y-2 text-sm font-semibold">Why this one? <span className="font-normal">optional</span><textarea name="description" rows={4} maxLength={4000} className={bucketFieldClass} defaultValue={item?.description ?? ""} /></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold">Priority<select aria-label="Priority" name="priority" className={bucketFieldClass} defaultValue={item?.priority ?? "medium"}>{bucketPriorities.map((value) => <option key={value}>{value}</option>)}</select></label><label className="space-y-2 text-sm font-semibold">Status<select aria-label="Status" name="status" className={bucketFieldClass} defaultValue={item?.status ?? "idea"}>{bucketStatuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="space-y-2 text-sm font-semibold">Target date <span className="font-normal">optional</span><Input name="targetDate" type="date" defaultValue={item?.target_date ?? ""} /></label><label className="space-y-2 text-sm font-semibold">Location <span className="font-normal">optional</span><Input name="location" maxLength={240} defaultValue={item?.location ?? ""} /></label></div>
    <fieldset><legend className="font-display text-2xl">Estimated cost <span className="font-sans text-sm text-muted-foreground">optional</span></legend><div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-3"><label className="space-y-2 text-sm font-semibold">Amount<Input name="cost" inputMode="decimal" defaultValue={item?.estimated_cost_minor != null ? (item.estimated_cost_minor / 100).toFixed(2) : ""} /></label><label className="space-y-2 text-sm font-semibold">Currency<Input name="currency" maxLength={3} placeholder="USD" defaultValue={item?.currency ?? ""} /></label></div></fieldset>
    <p role="status" className="min-h-6 text-sm text-primary">{message}</p><Button disabled={pending || !lists.length}>{pending ? "Saving…" : item ? "Save changes" : "Save this idea"}</Button>
  </form>;
}
