import Link from "next/link";
import { ItemEditor } from "@/components/bucket/item-editor";
import { loadBucketCategories, loadBucketLists } from "@/lib/bucket/data";

export const metadata = { title: "New bucket idea" };

export default async function NewBucketItemPage() {
  const [lists, categories] = await Promise.all([loadBucketLists(), loadBucketCategories()]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href="/bucket">
        Back to bucket lists
      </Link>
      <h1 className="mt-4 font-display text-5xl">Leave room for someday.</h1>
      <p className="mt-4 leading-7 text-muted-foreground">Start with an idea. You can work out the little steps together.</p>
      <section className="mt-8">
        {lists.length ? <ItemEditor lists={lists} categories={categories} /> : <p>Create a list on the bucket lists page first.</p>}
      </section>
    </div>
  );
}
