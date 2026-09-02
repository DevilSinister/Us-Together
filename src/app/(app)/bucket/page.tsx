import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BucketWorkspace } from "@/components/bucket/bucket-workspace";
import { loadBucketLists, loadBucketPage } from "@/lib/bucket/data";
import type { BucketList, BucketPage as PageData } from "@/lib/bucket/schema";
export const metadata = { title: "Bucket lists" };
export default async function BucketPage() {
  let lists: BucketList[] = [];
  let page: PageData = { items: [], next: null };
  let failure = "";
  try {
    [lists, page] = await Promise.all([loadBucketLists(), loadBucketPage({ listId: "", status: "", priority: "", category: "" })]);
  } catch (error) { failure = error instanceof Error ? error.message : "We couldn't load your lists."; }
  if (failure) return <section className="max-w-prose"><h1 className="font-display text-4xl">Your ideas belong here.</h1><p className="mt-4 leading-7 text-muted-foreground">{failure}</p><div className="mt-6 flex gap-3"><Button asChild><Link href="/pairing">Your shared space</Link></Button><Button asChild variant="outline"><Link href="/bucket">Try again</Link></Button></div></section>;
    return <div><header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Someday starts here</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em]">Our bucket lists.</h1><p className="mt-4 max-w-prose leading-7 text-muted-foreground">Keep the idea. Take a little step. Make it a day to remember.</p></div>{lists.length ? <Button asChild><Link href="/bucket/new">Add an idea</Link></Button> : null}</header><BucketWorkspace lists={lists} initialPage={page} /></div>;
}
