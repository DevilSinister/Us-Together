"use client";
import {useState,useTransition} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,Heart,MapPin,Pencil} from "lucide-react";

import {SavedLocation} from "@/components/entries/location-field";
import {deleteMemory} from "@/app/actions/memories";
import type {MemoryDetail} from "@/lib/memories/types";
import {MediaCollection} from "@/components/entries/media-collection";
import {MediaThumb} from "@/components/entries/media-thumb";
import {CommentThread} from "@/components/entries/comment-thread";
import {mediaHref} from "@/lib/entries/media-url";
import {PageHeader} from "@/components/app/page-header";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";

const longDate=new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"});

/**
 * One kept memory, read top to bottom: what it was, the story you wrote, where
 * it came from, what you captured, what you said to each other. Editing and
 * deleting wait at the end, so the page opens as something to read rather than
 * something to administer.
 *
 * The hero photograph is an amendment to that order, not a break with it. The
 * media collection below is administration - a chooser, an upload queue,
 * unfinished-upload recovery - while a single lead photograph is the memory's
 * face, and putting it first is what makes the page feel like an album rather
 * than a form. The administrative block stays exactly where it was.
 *
 * Favourite, rating and place used to be crammed into the eyebrow beside the
 * date. They are marks in their own row now; the eyebrow is the date alone.
 */
export function MemoryDetailView({data}:{data:MemoryDetail}){
 const {memory:m}=data,router=useRouter();
 const [error,setError]=useState(""),[confirmation,setConfirmation]=useState(""),[pending,start]=useTransition(),[fileCount,setFileCount]=useState<number|null>(null);
 const access={kind:"memory" as const,id:m.id,previewSession:data.previewSession};
 const provenance=data.planTitle||m.source_bucket_item_id;
 // loadMemory applies no state filter, unlike loadMemories, so an entry with a
 // pending upload would otherwise render a hero that cannot be fetched.
 const hero=m.media.find(f=>f.state==="ready"&&f.media_type==="image");

 return <div className="reveal-on-load">
  <PageHeader
   rule={false}
   back={<Link href="/memories" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="size-4" aria-hidden="true"/>All memories</Link>}
   eyebrow={<time dateTime={m.memory_date}>{longDate.format(new Date(m.memory_date+"T00:00:00Z"))}</time>}
   title={m.title}
  />

  {m.is_favorite||m.rating||m.location?<div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
   {m.is_favorite?<span className="inline-flex items-center gap-1.5 font-semibold text-rose">
    <Heart className="size-4 fill-current" aria-hidden="true"/>Favourite
   </span>:null}

   {m.rating?<span role="img" aria-label={"How it felt: "+m.rating+" out of 5"} className="inline-flex items-center gap-1">
    {/* A quiet ordinal meter. A second heart glyph beside the favourite heart
        would make one symbol carry two different meanings. */}
    {[1,2,3,4,5].map(i=><span key={i} aria-hidden="true" className={cn("size-1.5 rounded-full",i<=m.rating!?"bg-rose":"bg-border")}/>)}
   </span>:null}

   {m.location?<span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
    <MapPin className="size-4 shrink-0" aria-hidden="true"/>
    <span className="break-words"><SavedLocation value={m.location}/></span>
   </span>:null}
  </div>:null}

  {hero?<Link
   href={"/gallery?kind=memory&entry="+m.id}
   className="mt-6 block overflow-hidden rounded-surface bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
   <span className="relative block aspect-[16/9] sm:aspect-[21/9]">
    <MediaThumb src={mediaHref(hero.id,"memory","preview")} alt={hero.caption||m.title} sizes="(max-width:768px) 100vw, 44rem" eager/>
   </span>
  </Link>:null}

  <section aria-labelledby="memory-story" className="mt-6">
   <h2 id="memory-story" className="sr-only">The story</h2>
   <div className="max-w-2xl rounded-panel border bg-card p-5 sm:p-8">
    <div className="note-thread pl-5 sm:pl-6">
     {m.description
      ?<p className="whitespace-pre-wrap break-words text-lg leading-8">{m.description}</p>
      :<p className="text-lg leading-8 text-muted-foreground">No story here yet. Add one whenever the words arrive.</p>}
    </div>
    {/* Tags stay non-interactive on purpose. Linking each one to a filtered
        index would put a couple's private tag text into a URL, which the
        RLS-bound tag RPC in lib/memories/data.ts exists to avoid. */}
    {m.tags.length?<ul className="mt-6 flex flex-wrap gap-2 border-t pt-5">
     {m.tags.map(t=><li key={t} className="rounded-control bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{t}</li>)}
    </ul>:null}
   </div>
  </section>

  {provenance?<aside className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-panel bg-secondary px-5 py-1.5 text-sm">
   <span className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">Where this began</span>
   {data.planTitle?<Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/plans/"+m.source_plan_id}>The plan “{data.planTitle}”</Link>:null}
   {m.source_bucket_item_id?<Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/bucket/"+m.source_bucket_item_id}>Your bucket list</Link>:null}
  </aside>:null}

  <MediaCollection access={access} entryTitle={m.title} entryDate={m.memory_date} onCount={setFileCount} separated leadTile={!hero}/>

  <CommentThread access={access} timezone={data.timezone}/>

  {/* One foot, one rule: editing, its error slot, and deletion behind a
      disclosure, rather than three separately ruled blocks. */}
  <section className="mt-12 border-t pt-8">
   <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
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
  </section>
 </div>;
}
