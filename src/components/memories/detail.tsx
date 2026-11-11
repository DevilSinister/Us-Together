"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {CalendarHeart,Heart,ListChecks,MapPin,Pencil} from "lucide-react";

import {deleteMemory} from "@/app/actions/memories";
import type {MemoryDetail} from "@/lib/memories/types";
import {MediaCollection} from "@/components/entries/media-collection";
import {CommentThread} from "@/components/entries/comment-thread";
import {Cover,CoverSheet} from "@/components/app/cover";
import {Avatar} from "@/components/app/avatar";
import {useIdentities} from "@/components/providers/identities";
import {Button} from "@/components/ui/button";
import {ConfirmDelete} from "@/components/ui/confirm-delete";
import {EntryActions} from "@/components/app/entry-actions";
import {cn} from "@/lib/utils";

const longDate=new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"});

/**
 * One kept memory as a Cover screen (ADR-053). The lead photograph is the cover,
 * with the title laid over it and a round way back in its corner, so the page
 * opens as the memory's face rather than as a form. The sheet then reads top to
 * bottom: who kept it and how it felt, the story, where it came from, what you
 * captured, what you said to each other. Editing and deleting wait at the end.
 *
 * Tags and the place sit as chips between the keeper and the story, as in the
 * Cover mockups; the list rows leave them out.
 */
export function MemoryDetailView({data}:{data:MemoryDetail}){
 const {memory:m}=data,router=useRouter(),identities=useIdentities();
 const [fileCount,setFileCount]=useState<number|null>(null);
 const access={kind:"memory" as const,id:m.id,previewSession:data.previewSession};
 const keeper=data.keptBy==="me"?identities.me:identities.partner;
 // loadMemory applies no state filter, unlike loadMemories, so an entry with a
 // pending upload would otherwise put a photo on the cover that cannot be fetched.
 const hero=m.media.find(f=>f.state==="ready"&&f.media_type==="image");

 return <>
  <Cover
   labelledBy="memory-title"
   back={{href:"/memories",label:"All memories"}}
   photo={hero?{id:hero.id,kind:"memory",entryId:m.id}:null}
   previewSession={data.previewSession}
   previewEntry={{kind:"memory",id:m.id}}
  >
   <p className="text-sm text-muted-foreground">Memory · <time dateTime={m.memory_date}>{longDate.format(new Date(m.memory_date+"T00:00:00Z"))}</time></p>
   <h1 id="memory-title" className="mt-1 max-w-[20ch] text-balance break-words font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em] lg:text-5xl">{m.title}</h1>
  </Cover>

  <CoverSheet className="max-w-3xl">
   <div className="flex items-center justify-between gap-4">
    <p className="flex min-w-0 items-center gap-2.5 text-sm text-muted-foreground">
     <Avatar name={keeper.name} src={keeper.src} style={keeper.style} size="sm"/>
     <span className="truncate">Kept by {data.keptBy==="me"?"you":keeper.name}</span>
    </p>
    {m.is_favorite||m.rating?<div className="flex shrink-0 items-center gap-3">
     {m.is_favorite?<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
      <Heart className="size-4 fill-current" aria-hidden="true"/>Favourite
     </span>:null}
     {m.rating?<span role="img" aria-label={"How it felt: "+m.rating+" out of 5"} className="inline-flex items-center gap-1">
      {/* A quiet ordinal meter. A second heart glyph beside the favourite heart
          would make one symbol carry two different meanings. */}
      {[1,2,3,4,5].map(i=><span key={i} aria-hidden="true" className={cn("size-2 rounded-full",i<=m.rating!?"bg-primary":"bg-secondary")}/>)}
     </span>:null}
    </div>:null}
   </div>

   {/* Tags and the place, as chips under the keeper. Tags stay non-interactive on
       purpose: linking each one to a filtered index would put a couple's private
       tag text into a URL. */}
   {m.tags.length||m.location?<ul aria-label="Tags and place" className="stagger mt-4 flex flex-wrap gap-2">
    {m.tags.map(t=><li key={t} className="rounded-control bg-secondary px-3 py-1.5 text-[0.8125rem] font-semibold text-secondary-foreground">{t}</li>)}
    {m.location?<li className="inline-flex min-w-0 items-center gap-1.5 rounded-control bg-secondary px-3 py-1.5 text-[0.8125rem] font-semibold text-secondary-foreground">
     <MapPin className="size-3.5 shrink-0" aria-hidden="true"/><span className="break-words"><span className="sr-only">Place: </span>{m.location}</span>
    </li>:null}
   </ul>:null}

   <section aria-labelledby="memory-story" className="mt-5">
    <h2 id="memory-story" className="sr-only">The story</h2>
    {m.description
     ?<p className="whitespace-pre-wrap break-words text-lg leading-8">{m.description}</p>
     :<p className="text-lg leading-8 text-muted-foreground">No story here yet. Add one whenever the words arrive.</p>}
   </section>

   {data.planTitle||m.source_bucket_item_id?<aside aria-label="Where this began" className="mt-4 flex flex-col">
    {data.planTitle?<Link className="inline-flex min-h-11 items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary" href={"/plans/"+m.source_plan_id}>
     <CalendarHeart className="size-4 shrink-0" aria-hidden="true"/>From the plan “{data.planTitle}”
    </Link>:null}
    {m.source_bucket_item_id?<Link className="inline-flex min-h-11 items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary" href={"/bucket/"+m.source_bucket_item_id}>
     <ListChecks className="size-4 shrink-0" aria-hidden="true"/>From your bucket list
    </Link>:null}
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
