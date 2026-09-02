import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBucketItem, loadBucketLists } from "@/lib/bucket/data";
import { ItemDetail } from "@/components/bucket/item-detail";
import { ItemEditor } from "@/components/bucket/item-editor";
export const metadata = { title: "Your bucket idea" };
export default async function BucketItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, lists] = await Promise.all([loadBucketItem(id), loadBucketLists()]);
  if (!detail) notFound();
  const { item, subtasks } = detail;
  return <div className="mx-auto max-w-3xl"><Link href="/bucket" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Back to bucket lists</Link><header className="mt-5"><p className="text-sm text-primary">{item.status.replaceAll("_", " ")} · {item.priority} priority</p><h1 className="mt-2 break-words font-display text-5xl tracking-[-0.03em]">{item.title}</h1>{item.description ? <p className="mt-5 whitespace-pre-wrap break-words leading-8 text-muted-foreground">{item.description}</p> : null}<dl className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm">{item.category ? <div><dt className="font-semibold">Category</dt><dd>{item.category}</dd></div> : null}{item.location ? <div><dt className="font-semibold">Location</dt><dd className="break-words">{item.location}</dd></div> : null}{item.target_date ? <div><dt className="font-semibold">Target date</dt><dd>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item.target_date}T12:00:00Z`))}</dd></div> : null}{item.estimated_cost_minor !== null ? <div><dt className="font-semibold">Estimated cost</dt><dd>{item.currency} {(item.estimated_cost_minor / 100).toFixed(2)}</dd></div> : null}</dl></header><ItemDetail item={item} subtasks={subtasks} /><details className="mt-8 border-t pt-6"><summary className="min-h-11 cursor-pointer font-display text-2xl">Edit the idea</summary><div className="mt-4"><ItemEditor lists={lists} item={item} key={item.version} /></div></details></div>;
}
