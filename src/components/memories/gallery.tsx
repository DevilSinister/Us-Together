"use client";
import {EntryPreview} from "@/components/entries/entry-preview";
import { useState, useTransition } from "react";
import Link from "next/link";
import {SavedLocation} from "@/components/entries/location-field";
import { Heart } from "lucide-react";
import { filterMemories } from "@/app/actions/memories";
import type { MemoryPage } from "@/lib/memories/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function MemoryGallery({initial,previewSession}:{initial:MemoryPage;previewSession?:string}) {
 const [page,setPage]=useState(initial),[favorite,setFavorite]=useState(false),[tag,setTag]=useState(""),[applied,setApplied]=useState({favorite:false,tag:""}),[error,setError]=useState(""),[pending,start]=useTransition();
 const load=(more=false)=>start(async()=>{
  const filters=more?applied:{favorite,tag};
  try{
  const result=await filterMemories({...filters,cursor:more?page.next:null});
  if(!result.page){setError(result.error??"Could not load memories.");return;}
  setError("");setApplied(filters);
  setPage({memories:more?[...page.memories,...result.page.memories.filter(m=>!page.memories.some(old=>old.id===m.id))]:result.page.memories,next:result.page.next});
  }catch{setError("Could not load memories. Check your connection and try again.");}
 });
 return <section className="mt-8" aria-label="Memory gallery" aria-busy={pending}>
  <form onSubmit={e=>{e.preventDefault();load();}} className="flex flex-wrap items-end gap-4 border-b pb-6">
   <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs"><Label htmlFor="tag-filter">Find a tag</Label><Input id="tag-filter" value={tag} onChange={e=>setTag(e.target.value)} placeholder="All tags" maxLength={48}/></div>
   <label className="flex min-h-12 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={favorite} onChange={e=>setFavorite(e.target.checked)} className="size-5 accent-[var(--primary)]"/>Favorites only</label>
   <Button type="submit" variant="outline" disabled={pending}>Apply filters</Button>
  </form>
  {error?<p role="alert" className="status-message status-error mt-5">{error}</p>:null}
  <p className="sr-only" role="status">{pending?"Loading memories":page.memories.length+" memories shown"}</p>
  {!page.memories.length?<div className="py-12"><h2 className="font-display text-3xl">{applied.favorite||applied.tag?"No memories match just yet.":"Start with the detail you never want to lose."}</h2><p className="mt-4 max-w-prose leading-7 text-muted-foreground">{applied.favorite||applied.tag?"Try another tag or turn off Favorites only.":"A memory does not need to be a milestone. Keep an ordinary moment that already feels like yours."}</p><Button asChild className="mt-6"><Link href="/memories/new">Keep a memory</Link></Button></div>:
  <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{page.memories.map(m=><article key={m.id} id={m.id} className="min-w-0 border-b pb-6">
   <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><time dateTime={m.memory_date}>{new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"}).format(new Date(m.memory_date+"T00:00:00Z"))}</time>{m.is_favorite?<span className="inline-flex items-center gap-1 text-primary"><Heart className="size-4" aria-hidden="true"/>Favorite</span>:null}</div>
   <h2 className="mt-3 break-words font-display text-3xl"><Link className="hover:text-primary hover:underline" href={"/memories/"+m.id}>{m.title}</Link></h2>
   {m.description?<p className="mt-3 line-clamp-3 break-words leading-7 text-muted-foreground">{m.description}</p>:null}
   {m.location?<p className="mt-3 break-words text-sm text-muted-foreground"><SavedLocation value={m.location}/></p>:null}
   {m.tags.length?<p className="mt-3 break-words text-sm text-primary">{m.tags.join(" · ")}</p>:null}
   <EntryPreview access={{kind:"memory",id:m.id,previewSession}} entryTitle={m.title} entryDate={m.memory_date}/>
  </article>)}</div>}
  {page.next?<Button className="mt-8" variant="outline" disabled={pending} onClick={()=>load(true)}>{pending?"Loading…":"Load more memories"}</Button>:null}
 </section>;
}
