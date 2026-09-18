"use client";
import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { refreshWindow } from "@/lib/partner-sync";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { filterMemories } from "@/app/actions/memories";
import type { MemoryPage } from "@/lib/memories/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function MemoryGallery({initial}:{initial:MemoryPage}) {
 const [page,setPage]=useState(initial),[favorite,setFavorite]=useState(false),[tag,setTag]=useState(""),[applied,setApplied]=useState({favorite:false,tag:""}),[error,setError]=useState(""),[pending,start]=useTransition();
 usePartnerRefresh(async () => {
   const result = await refreshWindow<MemoryPage["memories"][number], NonNullable<MemoryPage["next"]>>(async cursor => {
     const response = await filterMemories({...applied,cursor});
     if (!response.page) throw Error("Refresh unavailable");
     return {items:response.page.memories,next:response.page.next};
   },page.memories.length);
   setPage(current => current === page ? {memories:result.items,next:result.next} : current);
 },pending);
 const load=(more=false)=>start(async()=>{
  const filters=more?applied:{favorite,tag};
  try{
  const result=await filterMemories({...filters,cursor:more?page.next:null});
  if(!result.page){setError(result.error??"Could not load memories.");return;}
  setError("");setApplied(filters);
  setPage({memories:more?[...page.memories,...result.page.memories.filter(m=>!page.memories.some(old=>old.id===m.id))]:result.page.memories,next:result.page.next});
  }catch{setError("Could not load memories. Check your connection and try again.");}
 });
 const grouped=page.memories.reduce<{date:string;memories:MemoryPage["memories"]}[]>((groups,memory)=>{
  const last=groups.at(-1);
  if(last?.date===memory.memory_date)last.memories.push(memory);
  else groups.push({date:memory.memory_date,memories:[memory]});
  return groups;
 },[]);
 return <section className="mt-8" aria-label="Memories by date" aria-busy={pending}>
  <form onSubmit={e=>{e.preventDefault();load();}} className="flex flex-wrap items-end gap-4 border-b pb-6">
   <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs"><Label htmlFor="tag-filter">Find a tag</Label><Input id="tag-filter" value={tag} onChange={e=>setTag(e.target.value)} placeholder="All tags" maxLength={48}/></div>
   <label className="flex min-h-12 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={favorite} onChange={e=>setFavorite(e.target.checked)} className="size-5 accent-[var(--primary)]"/>Favorites only</label>
   <Button type="submit" variant="outline" disabled={pending}>Apply filters</Button>
  </form>
  {error?<p role="alert" className="status-message status-error mt-5">{error}</p>:null}
  <p className="sr-only" role="status">{pending?"Loading memories":page.memories.length+" memories shown"}</p>
  {!page.memories.length?<div className="py-12"><h2 className="font-display text-3xl">{applied.favorite||applied.tag?"No memories match just yet.":"Start with the detail you never want to lose."}</h2><p className="mt-4 max-w-prose leading-7 text-muted-foreground">{applied.favorite||applied.tag?"Try another tag or turn off Favorites only.":"A memory does not need to be a milestone. Keep an ordinary moment that already feels like yours."}</p><Button asChild className="mt-6"><Link href="/memories/new">Keep a memory</Link></Button></div>:
  <div className="mt-8 max-w-3xl space-y-8">{grouped.map(group=><section key={group.date} aria-labelledby={"date-"+group.date}>
   <h2 id={"date-"+group.date} className="border-b pb-3 text-sm font-semibold text-primary"><time dateTime={group.date}>{new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"}).format(new Date(group.date+"T00:00:00Z"))}</time></h2>
   <ul className="divide-y">{group.memories.map(m=><li key={m.id} id={m.id}>
    <Link className="group flex min-h-16 items-center justify-between gap-4 py-3 font-display text-xl transition-colors hover:text-primary focus-visible:rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-2xl" href={"/memories/"+m.id}>
     <span className="min-w-0 break-words">{m.title}</span><ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true"/>
    </Link>
   </li>)}</ul>
  </section>)}</div>}
  {page.next?<Button className="mt-8" variant="outline" disabled={pending} onClick={()=>load(true)}>{pending?"Loading…":"Load more memories"}</Button>:null}
 </section>;
}
