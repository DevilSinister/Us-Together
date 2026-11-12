import { notFound } from "next/navigation";
import { Cover, CoverSheet } from "@/components/app/cover";
import { loadPlan } from "@/lib/plans/data";
import { PlanForm } from "@/components/dream/plan-form";

export const metadata = { title: "Edit plan" };

/** Changing a plan, in the Cover form pattern: the band names it and leads back to it. */
export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadPlan(id);
  if (!detail) notFound();
  return <>
    <Cover labelledBy="plan-form-title" height="band" back={{ href: "/plans/" + id, label: "Back to the plan" }}>
      <h1 id="plan-form-title" className="font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">Edit plan</h1>
      <p className="mt-1.5 break-words text-[0.9375rem] leading-6 text-muted-foreground">{detail.plan.title}</p>
    </Cover>
    <CoverSheet className="max-w-2xl">
      <PlanForm defaultTimezone={detail.plan.originating_timezone} plan={detail.plan} />
    </CoverSheet>
  </>;
}
