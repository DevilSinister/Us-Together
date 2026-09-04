import { notFound } from "next/navigation";
import { z } from "zod";
import { BucketWorkspace } from "@/components/bucket/bucket-workspace";
import { loadBucketCategories, loadBucketLists, loadBucketPage } from "@/lib/bucket/data";

export const metadata = { title: "List ideas" };

export default async function BucketListPage({ params }: { params: Promise<{ listId: string }> }) {
  const parsed = z.uuid().safeParse((await params).listId);
  if (!parsed.success) notFound();
  const listId = parsed.data;
  const lists = await loadBucketLists();
  if (!lists.some((list) => list.id === listId)) notFound();
  const [page, categories] = await Promise.all([
    loadBucketPage({ listId, status: "", priority: "", category: "" }),
    loadBucketCategories(),
  ]);
  return <BucketWorkspace key={listId} lists={lists} initialPage={page} listId={listId} categories={categories} />;
}
