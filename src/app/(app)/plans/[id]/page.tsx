import { notFound } from "next/navigation";
import { loadPlan,planContext } from "@/lib/plans/data";
import { PlanDetailView } from "@/components/plans/plan-detail";
export const metadata={title:"Plan details"};
export default async function PlanPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const detail=await loadPlan(id);if(!detail)notFound();
 const context=await planContext();
 return <PlanDetailView detail={detail} timezone={context.timezone} preview={context.kind==="preview"}/>;
}
