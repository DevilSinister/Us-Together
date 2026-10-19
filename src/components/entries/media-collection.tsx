"use client";
import {usePartnerRefresh} from "@/components/providers/partner-sync";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {entryMedia} from "@/app/actions/entries";
import {memoryMediaAction} from "@/app/actions/memories";
import {previewMedia,changePreviewMedia} from "@/lib/entries/preview-media";
import type {EntryAccess,EntryMedia} from "@/lib/entries/types";
import type {GalleryItem} from "@/lib/entries/gallery";
import {PhotoChooser,type QueuedPhoto} from "./photo-picker";
import {UnfinishedTile,UploadProgress,UploadTile} from "./upload-tiles";
import {useEntryUploads} from "./use-entry-uploads";
import {Button} from "@/components/ui/button";
import {MediaViewer} from "./media-viewer";
import {MediaTile} from "./media-tile";
import {cn} from "@/lib/utils";

function summary(photos:number,videos:number){
 const parts=[];
 if(photos)parts.push(photos+(photos===1?" photo":" photos"));
 if(videos)parts.push(videos+(videos===1?" video":" videos"));
 return parts.join(" · ");
}

/**
 * An entry's photos and videos, and the place new ones arrive.
 *
 * Choosing files starts sending them straight away, and each one appears in
 * the grid where it will live, developing as it sends, with one Pause control
 * for the batch beneath. Files this person left unfinished on another visit sit
 * in the same grid with Try again. A partner's half-sent files are never shown:
 * only their uploader can finish them, and nobody else should be able to
 * discard them mid-transfer. Entry-level comments are a sibling of this
 * section, not a child of it.
 */
export function MediaCollection({access,initial=[],onCount,separated=false,entryTitle="",entryDate="",previewOnly=false,leadTile=true}:{previewOnly?:boolean;access:EntryAccess;initial?:QueuedPhoto[];onCount?:(n:number)=>void;separated?:boolean;entryTitle?:string;entryDate?:string;leadTile?:boolean}){
 const [media,setMedia]=useState<EntryMedia[]>([]),[error,setError]=useState(""),[pending,setPending]=useState(false),[loading,setLoading]=useState(true),[selected,setSelected]=useState<string|null>(null);
 const [dropping,setDropping]=useState(false);
 const urls=useRef<string[]>([]),countCallback=useRef(onCount);const {kind,id,previewSession}=access;
 const editable=!previewOnly;
 useEffect(()=>{countCallback.current=onCount;},[onCount]);
 const reload=useCallback(async()=>{try{const a={kind,id,previewSession};let files:EntryMedia[];
 if(previewSession)files=await previewMedia(a);else{const r=await entryMedia(a);if(r.error)throw Error(r.error);files=r.media??[];}
 for(const u of urls.current)URL.revokeObjectURL(u);urls.current=files.flatMap(m=>[m.url,m.previewUrl].filter((x):x is string=>!!x));setMedia(files);countCallback.current?.(files.length);setError("");
 }catch(e){setError(e instanceof Error?e.message:"Could not load files.");}finally{setLoading(false);}},[kind,id,previewSession]);
 useEffect(()=>{const timer=setTimeout(()=>void reload(),0);return()=>{clearTimeout(timer);for(const u of urls.current)URL.revokeObjectURL(u);};},[reload]);
 const uploads=useEntryUploads({access,initial,onSaved:reload});
 const adding=uploads.items.length>0;
 usePartnerRefresh(reload,pending || loading || adding || !!previewSession);
 const ready:GalleryItem[]=media.filter(m=>m.state==="ready").map(m=>({...m,access,entryTitle,entryDate,sortKey:kind+":"+m.id}));
 const photos=ready.filter(m=>m.media_type==="image"),videos=ready.filter(m=>m.media_type==="video");
 const shown=(previewOnly?photos:[...photos,...videos]).slice(0,6),index=ready.findIndex(m=>m.id===selected);
 // Rows reserved by a file sending right now are that file's tile already.
 const inFlight=new Set(uploads.items.map(item=>item.stored).filter(Boolean));
 const unfinished=editable?media.filter(m=>m.state!=="ready"&&m.state!=="deleting"&&m.mine!==false&&!inFlight.has(m.id)):[];
 // The detail page may already be showing this entry's first photo as a hero,
 // in which case promoting it again here would print it twice at two sizes.
 const lead=leadTile&&!previewOnly&&shown.length>2&&!adding&&!unfinished.length;
 function accept(files:File[]){
  if(!editable||!files.length)return;
  try{uploads.add(files);setError("");}
  catch(problem){setError(problem instanceof Error?problem.message:"Those files couldn't be added.");}
 }
 async function settle(fileId:string,operation:"remove"|"finalize"){setPending(true);try{if(previewSession)await changePreviewMedia(access,fileId);else{const r=await memoryMediaAction({operation,kind,memoryId:id,id:fileId});if(r.error)throw Error(r.error);}await reload();}catch(e){setError(e instanceof Error?e.message:"That file couldn't be changed. Try again.");}finally{setPending(false);}}
 const grid=ready.length||adding||unfinished.length||!editable;
 return <section id={previewOnly?undefined:"photos"} className={(previewOnly?"mt-4":"mt-10")+(separated?" border-t pt-8":"")} aria-label="Photos and videos">
 <div className="flex flex-wrap items-center justify-between gap-2"><div>{!previewOnly?<h2 className="font-display text-section-title">Photos and videos</h2>:null}<p className={(previewOnly?"":"mt-2 ")+"text-sm text-muted-foreground"}>{ready.length?summary(photos.length,videos.length):previewOnly?"":"A place for the little things you captured."}</p></div>{ready.length&&(!previewOnly||ready.length>shown.length)?<Link className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href={"/gallery?kind="+kind+"&entry="+id}>{previewOnly?`View all ${ready.length} files`:"Open gallery"}<span className="sr-only"> from {entryTitle||kind}</span></Link>:null}</div>
 {loading?<p role="status" className="mt-5 text-muted-foreground">Loading photos…</p>:null}
 {error?<div className="mt-5 space-y-3"><p role="alert" className="status-message status-error">{error}</p>{!previewOnly&&!media.length?<Button variant="outline" onClick={()=>void reload()}>Try again</Button>:null}</div>:null}
 <div
  onDragOver={event=>{if(editable&&event.dataTransfer.types.includes("Files")){event.preventDefault();setDropping(true);}}}
  onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setDropping(false);}}
  onDrop={event=>{if(!editable)return;event.preventDefault();setDropping(false);accept(Array.from(event.dataTransfer.files));}}
  className={cn(previewOnly?"mt-2":"mt-5","rounded-panel transition-colors duration-200 motion-reduce:transition-none",dropping?"outline-2 outline-dashed outline-offset-4 outline-rose":null)}
 >
  {grid
   ?<div aria-label="Photo and video preview" className={"grid gap-3 "+(previewOnly?"grid-flow-col auto-cols-[42%] snap-x snap-mandatory overflow-x-auto pb-2 sm:auto-cols-[28%]":"grid-cols-3 sm:grid-cols-4")}>
     {shown.map((m,i)=><MediaTile key={m.id} item={m} eager={i<3} label={"Open "+(m.media_type==="image"?"photo":"video")+" "+(ready.indexOf(m)+1)} onOpen={()=>setSelected(m.id)} className={previewOnly?"snap-start":lead&&i===0?"col-span-2 row-span-2":undefined}/>)}
     {editable?unfinished.map(m=><UnfinishedTile key={m.id} media={m} busy={pending} onRetry={()=>void settle(m.id,"finalize")} onRemove={()=>void settle(m.id,"remove")}/>):null}
     {editable?uploads.items.map((item,i)=><UploadTile key={item.key} item={item} position={i+1} total={uploads.items.length} paused={uploads.paused} waiting={uploads.waiting} onRetry={()=>uploads.retry(item.key)} onRemove={()=>void uploads.remove(item.key)}/>):null}
     {editable?<PhotoChooser tile onFiles={accept} onError={setError}/>:null}
    </div>
   :!loading?<div className="max-w-sm"><PhotoChooser onFiles={accept} onError={setError}/></div>:null}
 </div>
 {editable?<UploadProgress items={uploads.items} paused={uploads.paused} waiting={uploads.waiting} onPause={()=>void uploads.pause()} onResume={uploads.resume}/>:null}
 {access.previewSession&&adding?<p className="mt-3 text-sm leading-6 text-muted-foreground">Preview photos stay in this browser for up to 24 hours. They are not uploaded to your shared account.</p>:null}
 {index>=0?<MediaViewer items={ready} index={index} onIndex={i=>setSelected(ready[i].id)} onClose={()=>setSelected(null)} onChange={reload}/>:null}
 </section>;
}
