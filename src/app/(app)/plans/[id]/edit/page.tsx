import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPlan } from "@/lib/plans/data";
import { PlanForm } from "@/components/dream/plan-form";
export const metadata={title:"Edit plan"};
export default async function EditPlanPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const detail=await loadPlan(id);if(!detail)notFound();
 return <div className="mx-auto max-w-3xl"><Link href={"/plans/"+id} className="inline-flex min-h-11 items-center font-semibold text-primary">Back to plan</Link><h1 className="my-6 font-display text-5xl">A change of plans.</h1><PlanForm defaultTimezone={detail.plan.originating_timezone} plan={detail.plan}/></div>;
}
