import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/states";
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
      <div className="reveal-on-load">
        <PageHeader scale="compact" eyebrow="Bucket lists" title="Your ideas belong here." />
        <EmptyState
          title="We couldn’t open your lists."
          body={failure}
          action={
            <>
              <Button asChild><Link href="/bucket">Try again</Link></Button>
              <Button asChild variant="outline"><Link href="/pairing">Your shared space</Link></Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="reveal-on-load">
      <BucketWorkspace lists={lists} initialPage={{ items: [], next: null }} />
    </div>
  );
}
