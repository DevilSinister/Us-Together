import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarWorkspace } from "@/components/plans/calendar-workspace";
import { loadPlans } from "@/lib/plans/data";
export const metadata:Metadata={title:"Plans"};
export default async function PlansPage(){
 const page=await loadPlans({});
 return <div className="reveal-on-load"><header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Shared time</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em]">Make time for us.</h1><p className="mt-3 max-w-[65ch] leading-7 text-muted-foreground">A quiet evening or a whole adventure. Keep the details together, then carry the experience into a memory.</p></div>{page.paired?<Button asChild><Link href="/plans/new">Plan something</Link></Button>:null}</header><Link href="/calendar" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Open calendar with memories and moments</Link>{page.paired?<CalendarWorkspace initial={page}/>:<section className="mt-8 rounded-2xl bg-secondary p-6"><h2 className="font-display text-3xl">Plans open with your shared space.</h2><Button asChild className="mt-5"><Link href="/pairing">Connect partner</Link></Button></section>}</div>;
}
