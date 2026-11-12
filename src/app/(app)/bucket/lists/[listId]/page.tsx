import { notFound } from "next/navigation";
import { z } from "zod";
import { BucketWorkspace } from "@/components/bucket/bucket-workspace";
import { loadBucketCategories, loadBucketOverview, loadBucketPage } from "@/lib/bucket/data";

export const metadata = { title: "Bucket list" };

/** One list. Its counts come from the overview, since the first page of ideas holds only twelve. */
export default async function BucketListPage({ params }: { params: Promise<{ listId: string }> }) {
  const parsed = z.uuid().safeParse((await params).listId);
  if (!parsed.success) notFound();
  const listId = parsed.data;
  const overview = await loadBucketOverview();
  const list = overview.lists.find((candidate) => candidate.id === listId);
  if (!list) notFound();
  const [page, categories] = await Promise.all([
    loadBucketPage({ listId, status: "", priority: "", category: "" }),
    loadBucketCategories(),
  ]);
  return <BucketWorkspace key={listId} list={{ id: list.id, title: list.title }} initialPage={page} summary={{ dreams: list.dreams, lived: list.lived }} categories={categories} />;
}
