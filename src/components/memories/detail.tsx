"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Heart,MapPin,Pencil,Sprout} from "lucide-react";

import {SavedLocation} from "@/components/entries/location-field";
import {deleteMemory} from "@/app/actions/memories";
import type {MemoryDetail} from "@/lib/memories/types";
import {MediaCollection} from "@/components/entries/media-collection";
import {CommentThread} from "@/components/entries/comment-thread";
import {Cover,CoverBack,CoverSheet} from "@/components/app/cover";
import {Button} from "@/components/ui/button";
import {ConfirmDelete} from "@/components/ui/confirm-delete";
import {EntryActions} from "@/components/app/entry-actions";
import {cn} from "@/lib/utils";

const longDate=new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"});

/**
 * One kept memory as a Cover screen (ADR-053). The lead photograph is the cover,
 * with the title laid over it, so the page opens as the memory's face rather
 * than as a form. The sheet then reads top to bottom: how it felt and where,
 * the story, where it came from, what you captured, what you said to each
 * other. Editing and deleting wait at the end.
 *
 * The media collection below is still the administrative block - chooser,
 * upload queue, unfinished-upload recovery - and stays exactly as it was.
 */
export function MemoryDetailView({data}:{data:MemoryDetail}){
 const {memory:m}=data,router=useRouter();
 const [fileCount,setFileCount]=useState<number|null>(null);
 const access={kind:"memory" as const,id:m.id,previewSession:data.previewSession};
 const provenance=data.planTitle||m.source_bucket_item_id;
 const marks=m.is_favorite||m.rating||m.location;
 // loadMemory applies no state filter, unlike loadMemories, so an entry with a
 // pending upload would otherwise put a photo on the cover that cannot be fetched.
 const hero=m.media.find(f=>f.state==="ready"&&f.media_type==="image");

 return <>
  <Cover
   labelledBy="memory-title"
   photo={hero?{id:hero.id,kind:"memory",entryId:m.id}:null}
   previewSession={data.previewSession}
   previewEntry={{kind:"memory",id:m.id}}
  >
   <CoverBack href="/memories">All memories</CoverBack>
   <p className="text-sm text-muted-foreground">Memory · <time dateTime={m.memory_date}>{longDate.format(new Date(m.memory_date+"T00:00:00Z"))}</time></p>
   <h1 id="memory-title" className="mt-1 max-w-[20ch] text-balance break-words font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em] lg:text-5xl">{m.title}</h1>
  </Cover>

  <CoverSheet className="max-w-3xl">
   {marks?<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
    {m.is_favorite?<span className="inline-flex items-center gap-1.5 font-semibold text-primary">
     <Heart className="size-4 fill-current" aria-hidden="true"/>Favourite
    </span>:null}

    {m.rating?<span role="img" aria-label={"How it felt: "+m.rating+" out of 5"} className="inline-flex items-center gap-1">
     {/* A quiet ordinal meter. A second heart glyph beside the favourite heart
         would make one symbol carry two different meanings. */}
     {[1,2,3,4,5].map(i=><span key={i} aria-hidden="true" className={cn("size-2 rounded-full",i<=m.rating!?"bg-primary":"bg-secondary")}/>)}
    </span>:null}

    {m.location?<span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
     <MapPin className="size-4 shrink-0" aria-hidden="true"/>
     <span className="break-words"><SavedLocation value={m.location}/></span>
    </span>:null}
   </div>:null}

   <section aria-labelledby="memory-story" className={marks?"mt-5":undefined}>
    <h2 id="memory-story" className="sr-only">The story</h2>
    {m.description
     ?<p className="whitespace-pre-wrap break-words text-lg leading-8">{m.description}</p>
     :<p className="text-lg leading-8 text-muted-foreground">No story here yet. Add one whenever the words arrive.</p>}
    {/* Tags stay non-interactive on purpose. Linking each one to a filtered
        index would put a couple's private tag text into a URL, which the
        RLS-bound tag RPC in lib/memories/data.ts exists to avoid. */}
    {m.tags.length?<ul className="mt-5 flex flex-wrap gap-2">
     {m.tags.map(t=><li key={t} className="rounded-control bg-secondary px-3 py-1.5 text-[0.8125rem] font-semibold text-secondary-foreground">{t}</li>)}
    </ul>:null}
   </section>

   {provenance?<aside aria-label="Where this began" className="mt-5 flex flex-wrap items-center gap-x-4 border-t pt-3 text-sm text-muted-foreground">
    <span className="inline-flex items-center gap-2"><Sprout className="size-4" aria-hidden="true"/>Where this began</span>
    {data.planTitle?<Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/plans/"+m.source_plan_id}>The plan “{data.planTitle}”</Link>:null}
    {m.source_bucket_item_id?<Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/bucket/"+m.source_bucket_item_id}>Your bucket list</Link>:null}
   </aside>:null}

   <MediaCollection access={access} entryTitle={m.title} entryDate={m.memory_date} onCount={setFileCount} separated leadTile={!hero}/>

   <CommentThread access={access} timezone={data.timezone}/>

   <EntryActions label="Change this memory" hint="Edit changes the story, date, place, tags, or favorite. Deleting keeps the plan or bucket idea it came from.">
    <Button asChild variant="outline"><Link href={"/memories/"+m.id+"/edit"}><Pencil className="size-4" aria-hidden="true"/>Edit memory</Link></Button>
    <ConfirmDelete
     label="Delete memory"
     title="Delete this memory?"
     description={<><strong className="font-semibold text-foreground">“{m.title}”</strong> and its story are removed for both of you. Its source plan or bucket idea stays.</>}
     blocked={fileCount===null?"Checking this memory’s photos and videos…":fileCount>0?"Remove its "+fileCount+" "+(fileCount===1?"photo or video":"photos and videos")+", including unfinished uploads, first. Then you can delete the story.":null}
     leavesPage
     onConfirm={async()=>{const result=await deleteMemory({id:m.id,version:m.version,confirmation:"DELETE"});if(!result.ok)return result.error??"Could not delete this memory.";router.push("/memories");router.refresh();}}
    />
   </EntryActions>
  </CoverSheet>
 </>;
}
