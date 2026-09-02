import Link from "next/link";
import {Button} from "@/components/ui/button";
import {SharedCalendar} from "@/components/entries/calendar";
import {loadSharedCalendar} from "@/app/actions/calendar";
import {planContext} from "@/lib/plans/data";
import {localDate} from "@/lib/plans/calendar";
export const metadata={title:"Calendar"};
export default async function CalendarPage(){const c=await planContext(),initial=await loadSharedCalendar({date:localDate(new Date(),c.timezone)});return <div className="reveal-on-load"><header className="border-b pb-8"><p className="text-sm font-semibold text-primary">A date for every part of your story</p><h1 className="mt-2 font-display text-5xl sm:text-6xl">Your shared calendar.</h1><p className="mt-4 max-w-prose text-lg leading-8 text-muted-foreground">Plans ahead, memories kept, and moments worth marking, together in one place.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/plans/new">New plan</Link></Button><Button asChild variant="outline"><Link href="/memories/new">Add memory</Link></Button><Button asChild variant="outline"><Link href="/milestones/new">Add moment</Link></Button><Button asChild variant="ghost"><Link href="/plans">Manage plans</Link></Button></div></header>{initial.paired?<SharedCalendar initial={initial}/>:<p className="mt-8"><Link href="/pairing" className="font-semibold text-primary underline">Connect your shared space</Link> to start your calendar.</p>}</div>;}
