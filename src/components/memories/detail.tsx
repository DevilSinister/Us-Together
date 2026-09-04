"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import {SavedLocation} from "@/components/entries/location-field";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { deleteMemory } from "@/app/actions/memories";
import type { MemoryDetail } from "@/lib/memories/types";
import { MediaCollection } from "@/components/entries/media-collection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function MemoryDetailView({data}:{data:MemoryDetail}){
 const {memory:m}=data,router=useRouter();
 const [error,setError]=useState(""),[confirmation,setConfirmation]=useState(""),[pending,start]=useTransition(),[fileCount,setFileCount]=useState<number|null>(null);
 const access={kind:"memory" as const,id:m.id,previewSession:data.previewSession};
 return <div className="reveal-on-load">
  <Link href="/memories" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Back to memories</Link>
  <header className="mt-7 border-b pb-8"><div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><time dateTime={m.memory_date}>{new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"}).format(new Date(m.memory_date+"T00:00:00Z"))}</time>{m.is_favorite?<span className="inline-flex items-center gap-1 text-primary"><Heart className="size-4" aria-hidden="true"/>Favorite</span>:null}</div>
   <h1 className="mt-3 max-w-4xl break-words font-display text-5xl tracking-[-0.03em] sm:text-6xl">{m.title}</h1>
   {m.location?<p className="mt-4 break-words text-muted-foreground"><SavedLocation value={m.location}/></p>:null}
   {m.rating?<p className="mt-3 text-sm font-semibold text-primary">How it felt · {m.rating} / 5</p>:null}
   <Button asChild variant="outline" className="mt-6"><Link href={"/memories/"+m.id+"/edit"}>Edit memory</Link></Button>
  </header>
  {m.description?<p className="mt-8 max-w-prose whitespace-pre-wrap break-words text-lg leading-8">{m.description}</p>:null}
  {m.tags.length?<p className="mt-6 break-words text-sm text-primary">{m.tags.join(" · ")}</p>:null}
  {data.planTitle||m.source_bucket_item_id?<aside className="mt-8 max-w-prose rounded-panel bg-secondary p-5"><h2 className="font-display text-2xl">Where this moment began</h2>{data.planTitle?<Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href={"/plans/"+m.source_plan_id}>From the plan “{data.planTitle}”</Link>:null}{m.source_bucket_item_id?<Link className="block min-h-11 py-3 text-sm font-semibold text-primary hover:underline" href={"/bucket/"+m.source_bucket_item_id}>From your bucket list</Link>:null}</aside>:null}
  <div className="mt-10"><MediaCollection access={access} entryTitle={m.title} entryDate={m.memory_date} onCount={setFileCount} separated={!!(m.description||m.tags.length||data.planTitle||m.source_bucket_item_id)}/></div>

  {error?<p className="status-message status-error mt-6" role="alert">{error}</p>:null}
  <details className="mt-12 border-t pt-5"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-danger">Delete this memory</summary><p className="mt-3 max-w-prose leading-7 text-muted-foreground">This permanently removes the story. Its source plan or bucket idea stays. Remove all files and unfinished uploads first.</p><form className="mt-5 max-w-sm space-y-4" onSubmit={e=>{e.preventDefault();start(async()=>{try{const result=await deleteMemory({id:m.id,version:m.version,confirmation});if(result.ok){router.push("/memories");router.refresh();}else setError(result.error??"Could not delete.");}catch{setError("Could not confirm deletion. Check your connection, then refresh before trying again.");}});}}><Label htmlFor="delete-memory">Type DELETE to confirm</Label><Input id="delete-memory" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/><Button type="submit" variant="outline" className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" disabled={pending||confirmation!=="DELETE"||fileCount===null||fileCount>0}>Permanently delete memory</Button></form></details>
 </div>;
}
