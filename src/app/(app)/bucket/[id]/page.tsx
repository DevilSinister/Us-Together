import { notFound } from "next/navigation";
import { Cover, CoverSheet } from "@/components/app/cover";
import { ItemDetail } from "@/components/bucket/item-detail";
import { IdeaMenu } from "@/components/bucket/idea-menu";
import { loadBucketCategories, loadBucketItem, loadBucketLists } from "@/lib/bucket/data";
import { priorityLevel } from "@/lib/bucket/grouping";
import { cn } from "@/lib/utils";

export const metadata = { title: "Your bucket idea" };

const statusWords: Record<string, string> = { idea: "Idea", planned: "Planned", in_progress: "In progress", completed: "Lived" };
// A server component cannot call a function exported from a client module, so the label is spelled here.
const bucketLabel = (value: string) => { const words = value.replaceAll("_", " "); return words.charAt(0).toUpperCase() + words.slice(1); };

/**
 * One bucket idea as a Cover screen (ADR-053): the band names the list it
 * belongs to and leads back to it, says where the idea stands, its title, and
 * how much you want it as the same four-dot meter the list uses.
 */
export default async function BucketItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, lists, categories] = await Promise.all([loadBucketItem(id), loadBucketLists(), loadBucketCategories()]);
  if (!detail) notFound();
  const { item, subtasks } = detail;
  const list = lists.find((candidate) => candidate.id === item.list_id);
  const level = priorityLevel(item.priority);

  return (
    <>
      <Cover labelledBy="idea-title" height="band" back={{ href: `/bucket/lists/${item.list_id}`, label: list ? `Back to ${list.title}` : "Back to the list" }} menu={<IdeaMenu item={item} lists={lists} categories={categories} />}>
        <p className="text-[0.8125rem] font-semibold text-primary">{[list?.title, statusWords[item.status] ?? bucketLabel(item.status)].filter(Boolean).join(" · ")}</p>
        <h1 id="idea-title" className="mt-1.5 text-balance break-words font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">{item.title}</h1>
        <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-muted-foreground">
          <span className="flex gap-[3px]" aria-hidden="true">
            {[1, 2, 3, 4].map((mark) => <span key={mark} className={cn("size-1.5 rounded-full", mark <= level ? "bg-rose" : "bg-border")} />)}
          </span>
          {bucketLabel(item.priority)}<span className="sr-only"> priority</span>
        </p>
      </Cover>
      <CoverSheet className="max-w-2xl">
        <ItemDetail item={item} subtasks={subtasks} />
      </CoverSheet>
    </>
  );
}
