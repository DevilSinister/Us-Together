"use client";
import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { refreshWindow } from "@/lib/partner-sync";

import {useState,useTransition,useRef} from "react";
import Link from "next/link";
import {ChevronLeft,ChevronRight,CalendarDays,Images,Flag} from "lucide-react";
import {Button} from "@/components/ui/button";
import {loadSharedCalendar} from "@/app/actions/calendar";
import {calendarDays,addDays,localDate} from "@/lib/plans/calendar";
import {entriesOnDay,type SharedCalendarPage} from "@/lib/entries/calendar";
const labels={plan:"Plan",memory:"Memory",moment:"Moment"},icons={plan:CalendarDays,memory:Images,moment:Flag};
const kinds=["plan","memory","moment"] as const;
const markers={plan:"rounded-full bg-primary",memory:"rounded-none bg-rose",moment:"rotate-45 rounded-none bg-secondary-foreground"};
const dayLabel=(d:string)=>new Intl.DateTimeFormat("en",{dateStyle:"full",timeZone:"UTC"}).format(new Date(d+"T12:00:00Z"));
export function SharedCalendar({initial}:{initial:SharedCalendarPage}){
 const [page,setPage]=useState(initial),[selected,setSelected]=useState(initial.date),[kind,setKind]=useState("all"),[error,setError]=useState(""),[pending,start]=useTransition(),grid=useRef<HTMLDivElement>(null);
 usePartnerRefresh(async () => {
   const result = await refreshWindow<SharedCalendarPage["entries"][number], SharedCalendarPage["next"]>(async cursors => {
     const response = await loadSharedCalendar({date:page.date,view:page.view,cursors:cursors ?? undefined});
     return {items:response.entries,next:Object.values(response.next).some(Boolean)?response.next:null};
   },page.entries.length);
   setPage(current => current === page ? {...current,entries:result.items,next:result.next ?? {plan:null,memory:null,moment:null}} : current);
 },pending);
 const days=calendarDays(page.view,page.date),entries=page.entries.filter(e=>kind==="all"||kind===e.kind),onDay=entriesOnDay(entries,selected),today=localDate(new Date(),page.timezone);
 function load(date:string,view=page.view,more=false){start(async()=>{try{const next=await loadSharedCalendar({date,view,cursors:more?page.next:undefined});setPage(more?{...next,entries:[...page.entries,...next.entries]}:next);if(!more)setSelected(date);setError("");}catch{setError("Could not load these dates. Your current calendar is still here. Try again.");}});}
 function move(delta:number){if(page.view==="week")return load(addDays(page.date,delta*7));const d=new Date(page.date.slice(0,7)+"-01T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+delta);load(d.toISOString().slice(0,10));}
 return <section className="mt-8" aria-label="Shared calendar" aria-busy={pending}>
 <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2"><Button variant="outline" disabled={pending} aria-label="Previous period" onClick={()=>move(-1)}><ChevronLeft className="size-4"/></Button><h2 className="min-w-0 font-display text-2xl sm:text-3xl">{new Intl.DateTimeFormat("en",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(page.date+"T12:00:00Z"))}</h2><Button variant="outline" disabled={pending} aria-label="Next period" onClick={()=>move(1)}><ChevronRight className="size-4"/></Button></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={pending} onClick={()=>load(today)}>Today</Button>{(["month","week"] as const).map(v=><Button key={v} variant={page.view===v?"default":"outline"} aria-pressed={page.view===v} disabled={pending} onClick={()=>load(selected,v)}>{v==="month"?"Month":"Week"}</Button>)}</div></div>
 <div className="mt-5 flex flex-wrap gap-2" aria-label="Calendar filters">{[["all","Everything"],["plan","Plans"],["memory","Memories"],["moment","Moments"]].map(([value,label])=><Button key={value} variant={kind===value?"default":"ghost"} aria-pressed={kind===value} onClick={()=>setKind(value)}>{label}</Button>)}</div>
 <p className="mt-3 text-sm text-muted-foreground">Plan times use {page.timezone}. Memories and moments stay on their saved date.</p>
 {error?<p role="alert" className="status-message status-error mt-4">{error}</p>:null}
 <div ref={grid} className="mt-5 overflow-hidden rounded-panel border"><div className="grid grid-cols-7 border-b bg-secondary">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d} className="py-3 text-center text-xs font-semibold">{d}</span>)}</div><div className="grid grid-cols-7">{days.map((day,i)=>{const matches=entriesOnDay(entries,day),active=day===selected;return <button key={day} type="button" aria-label={dayLabel(day)+", "+(matches.length?matches.length+" "+(matches.length===1?"entry":"entries")+": "+kinds.filter(k=>matches.some(x=>x.kind===k)).map(k=>labels[k]).join(", "):"nothing saved")} aria-pressed={active} aria-current={day===today?"date":undefined} tabIndex={active||!days.includes(selected)&&i===0?0:-1} className={"min-h-20 min-w-0 border-b border-r p-1.5 text-left focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-28 sm:p-3 "+(active?"bg-secondary ring-2 ring-inset ring-primary":"hover:bg-secondary/50")} onClick={()=>setSelected(day)} onKeyDown={e=>{const delta=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:e.key==="ArrowDown"?7:e.key==="ArrowUp"?-7:0;if(delta){e.preventDefault();const next=Math.max(0,Math.min(days.length-1,i+delta));setSelected(days[next]);grid.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();}}}><span className={"inline-grid size-7 place-items-center rounded-full text-sm "+(day===today?"bg-primary text-primary-foreground":day.slice(0,7)!==page.date.slice(0,7)?"text-muted-foreground":"")}>{Number(day.slice(-2))}</span><span className="mt-1 flex flex-wrap gap-1" aria-hidden="true">{kinds.map(k=>matches.some(x=>x.kind===k)?<span key={k} title={labels[k]} className={"size-2 "+markers[k]}/>:null)}</span>{matches.length?<span className="mt-1 block text-xs text-muted-foreground">{matches.length} <span className="hidden sm:inline">{matches.length===1?"entry":"entries"}</span></span>:null}</button>;})}</div></div>
 {Object.values(page.next).some(Boolean)?<Button className="mt-4" variant="outline" disabled={pending} onClick={()=>load(page.date,page.view,true)}>Load more calendar entries</Button>:null}
 <div className="mt-8" aria-live="polite"><h3 className="font-display text-3xl">{dayLabel(selected)}</h3>{onDay.length?<ul className="mt-4 divide-y border-y">{onDay.map(e=>{const Icon=icons[e.kind];return <li key={e.kind+e.id}><Link href={e.href} className="flex min-h-20 items-center gap-4 py-4 hover:text-primary"><Icon className="size-5 shrink-0 text-primary" aria-hidden="true"/><span className="min-w-0"><span className="block text-xs font-semibold text-muted-foreground">{labels[e.kind]}{e.status?" · "+e.status:""}</span><span className="mt-1 block break-words text-lg font-semibold">{e.title}</span></span></Link></li>;})}</ul>:<p className="mt-4 text-muted-foreground">Nothing saved for this date{kind!=="all"?" in this filter":""}. Choose another day or add something to remember.</p>}</div>
 </section>;
}
