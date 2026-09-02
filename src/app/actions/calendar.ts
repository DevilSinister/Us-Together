"use server";
import {planContext,loadPlans} from "@/lib/plans/data";
import {calendarDays,addDays,localDate} from "@/lib/plans/calendar";
import {sharedCalendarFilter,type CalendarEntry,type SharedCalendarPage} from "@/lib/entries/calendar";
export async function loadSharedCalendar(input:unknown):Promise<SharedCalendarPage>{
 const f=sharedCalendarFilter.parse(input),c=await planContext(),days=calendarDays(f.view,f.date),from=days[0],until=addDays(days.at(-1)!,1);
 const result:SharedCalendarPage={entries:[],next:{plan:null,memory:null,moment:null},timezone:c.timezone,paired:c.paired,date:f.date,view:f.view};
 if(!c.paired)return result;
 const planPromise=(!f.cursors||f.cursors.plan)?loadPlans({view:f.view,date:f.date,status:"all",cursor:f.cursors?.plan??undefined}):null;
 async function dates(kind:"memory"|"moment"){
  if(f.cursors&&!f.cursors[kind])return;
  const cursor=f.cursors?.[kind];let rows:{id:string;title:string;date:string}[]=[];
  if(c.kind==="preview")rows=(kind==="memory"?c.state.memories.map(x=>({id:x.id,title:x.title,date:x.memoryDate})):c.state.milestones.map(x=>({id:x.id,title:x.title,date:x.milestoneDate}))).filter(x=>x.date>=from&&x.date<until&&(!cursor||x.date>cursor.date||x.date===cursor.date&&x.id>cursor.id)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  else if(kind==="memory"){let q=c.db.from("memories").select("id,title,memory_date").eq("couple_id",c.coupleId!).gte("memory_date",from).lt("memory_date",until).order("memory_date").order("id").limit(251);if(cursor)q=q.or("memory_date.gt."+cursor.date+",and(memory_date.eq."+cursor.date+",id.gt."+cursor.id+")");const {data,error}=await q;if(error)throw Error("Could not load calendar memories.");rows=data.map(x=>({...x,date:x.memory_date}));}
  else {let q=c.db.from("milestones").select("id,title,milestone_date").eq("couple_id",c.coupleId!).gte("milestone_date",from).lt("milestone_date",until).order("milestone_date").order("id").limit(251);if(cursor)q=q.or("milestone_date.gt."+cursor.date+",and(milestone_date.eq."+cursor.date+",id.gt."+cursor.id+")");const {data,error}=await q;if(error)throw Error("Could not load calendar moments.");rows=data.map(x=>({...x,date:x.milestone_date}));}
  const page=rows.slice(0,250),last=page.at(-1);result.next[kind]=rows.length>250&&last?{date:last.date,id:last.id}:null;result.entries.push(...page.map(x=>({id:x.id,title:x.title,kind,day:x.date,endDay:x.date,href:(kind==="memory"?"/memories/":"/milestones/")+x.id})));
 }
 const [plans]=await Promise.all([planPromise,dates("memory"),dates("moment")]);
 if(plans){result.next.plan=plans.next;result.entries.push(...plans.plans.map((p):CalendarEntry=>({id:p.id,title:p.title,kind:"plan",day:localDate(p.starts_at,c.timezone),endDay:localDate(p.ends_at&&p.ends_at>p.starts_at?new Date(Date.parse(p.ends_at)-1):p.starts_at,c.timezone),href:"/plans/"+p.id,status:p.status})));}
 result.entries.sort((a,b)=>a.day.localeCompare(b.day)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));return result;
}
