import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BucketWorkspace } from "@/components/bucket/bucket-workspace";
import { loadBucketLists } from "@/lib/bucket/data";
import type { BucketList } from "@/lib/bucket/schema";

export const metadata = { title: "Bucket lists" };

export default async function BucketPage() {
  let lists: BucketList[] = [];
  let failure = "";

  try {
    lists = await loadBucketLists();
  } catch (error) {
    failure = error instanceof Error ? error.message : "We couldn't load your lists.";
  }

  if (failure) {
    return (
      <section className="max-w-prose">
        <h1 className="font-display text-4xl">Your ideas belong here.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{failure}</p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/pairing">Your shared space</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bucket">Try again</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div>
      <BucketWorkspace lists={lists} initialPage={{ items: [], next: null }} />
    </div>
  );
}
