"use client";
import {useState,useTransition} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,Heart,Pencil} from "lucide-react";

import {SavedLocation} from "@/components/entries/location-field";
import {deleteMemory} from "@/app/actions/memories";
import type {MemoryDetail} from "@/lib/memories/types";
import {MediaCollection} from "@/components/entries/media-collection";
import {CommentThread} from "@/components/entries/comment-thread";
import {PageHeader} from "@/components/app/page-header";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

const longDate=new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"});

/**
 * One kept memory, read top to bottom: what it was, the story you wrote, where
 * it came from, what you captured, what you said to each other. Editing and
 * deleting wait at the end, so the page opens as something to read rather than
 * something to administer.
 */
export function MemoryDetailView({data}:{data:MemoryDetail}){
 const {memory:m}=data,router=useRouter();
 const [error,setError]=useState(""),[confirmation,setConfirmation]=useState(""),[pending,start]=useTransition(),[fileCount,setFileCount]=useState<number|null>(null);
 const access={kind:"memory" as const,id:m.id,previewSession:data.previewSession};
 const provenance=data.planTitle||m.source_bucket_item_id;

 return <div className="reveal-on-load">
  <PageHeader
   rule={false}
   back={<Link href="/memories" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true"/>All memories</Link>}
   eyebrow={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
    <time dateTime={m.memory_date}>{longDate.format(new Date(m.memory_date+"T00:00:00Z"))}</time>
    {m.is_favorite?<span className="inline-flex items-center gap-1"><Heart className="size-3.5 fill-current" aria-hidden="true"/>Favorite</span>:null}
    {m.rating?<span>How it felt {m.rating}/5</span>:null}
   </span>}
   title={m.title}
   lede={m.location?<span className="break-words"><SavedLocation value={m.location}/></span>:null}
  />

  <section aria-labelledby="memory-story" className="mt-4">
   <h2 id="memory-story" className="sr-only">The story</h2>
   <div className="max-w-2xl rounded-panel border bg-card p-5 sm:p-8">
    <div className="note-thread pl-5 sm:pl-6">
     {m.description
      ?<p className="whitespace-pre-wrap break-words text-lg leading-8">{m.description}</p>
      :<p className="text-lg leading-8 text-muted-foreground">No story here yet. Add one whenever the words arrive.</p>}
    </div>
    {m.tags.length?<p className="mt-6 break-words border-t pt-5 text-sm text-muted-foreground">{m.tags.join(" · ")}</p>:null}
   </div>
  </section>

  {provenance?<aside className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-panel bg-secondary px-5 py-2 text-sm">
   <span className="font-semibold text-secondary-foreground">Where this began</span>
   {data.planTitle?<Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/plans/"+m.source_plan_id}>The plan “{data.planTitle}”</Link>:null}
   {m.source_bucket_item_id?<Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/bucket/"+m.source_bucket_item_id}>Your bucket list</Link>:null}
  </aside>:null}

  <MediaCollection access={access} entryTitle={m.title} entryDate={m.memory_date} onCount={setFileCount} separated/>

  <CommentThread access={access}/>

  <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-8">
   <Button asChild><Link href={"/memories/"+m.id+"/edit"}><Pencil className="size-4" aria-hidden="true"/>Edit memory</Link></Button>
   <p className="text-sm text-muted-foreground">Change the story, date, place, tags, or favorite.</p>
  </div>

  {error?<p className="status-message status-error mt-6" role="alert">{error}</p>:null}

  <details className="mt-6">
   <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-danger">Delete this memory</summary>
   <p className="mt-3 max-w-prose leading-7 text-muted-foreground">This permanently removes the story. Its source plan or bucket idea stays. Remove all files and unfinished uploads first.</p>
   <form className="mt-5 max-w-sm space-y-4" onSubmit={e=>{e.preventDefault();start(async()=>{try{const result=await deleteMemory({id:m.id,version:m.version,confirmation});if(result.ok){router.push("/memories");router.refresh();}else setError(result.error??"Could not delete.");}catch{setError("Could not confirm deletion. Check your connection, then refresh before trying again.");}});}}>
    <Label htmlFor="delete-memory">Type DELETE to confirm</Label>
    <Input id="delete-memory" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/>
    <Button type="submit" variant="outline" className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" disabled={pending||confirmation!=="DELETE"||fileCount===null||fileCount>0}>Permanently delete memory</Button>
   </form>
  </details>
 </div>;
}
