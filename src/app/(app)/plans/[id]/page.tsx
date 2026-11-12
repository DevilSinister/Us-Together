import { notFound } from "next/navigation";
import { loadPlan, planContext } from "@/lib/plans/data";
import { loadBucketItem, loadBucketLists } from "@/lib/bucket/data";
import { PlanDetailView } from "@/components/plans/plan-detail";

export const metadata = { title: "Plan details" };

/**
 * One plan. The clock is read once here and handed down, so the server and the
 * hydrated page agree on whether a plan is still ahead. The bucket idea a plan
 * began as is looked up here; if it has since been deleted the plan simply
 * has no "Where it began".
 */
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadPlan(id);
  if (!detail) notFound();
  const context = await planContext();
  const sourceId = detail.plan.source_bucket_item_id;
  let origin: { id: string; title: string; list: string | null } | null = null;
  if (sourceId) {
    try {
      const [source, lists] = await Promise.all([loadBucketItem(sourceId), loadBucketLists()]);
      if (source) origin = { id: source.item.id, title: source.item.title, list: lists.find((list) => list.id === source.item.list_id)?.title ?? null };
    } catch { /* the link is a convenience; the plan stands without it */ }
  }
  return <PlanDetailView detail={detail} timezone={context.timezone} preview={context.kind === "preview"} now={new Date().toISOString()} origin={origin} />;
}
