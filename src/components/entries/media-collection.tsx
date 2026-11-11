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
import {useUploadOwner} from "@/components/providers/upload-owner";
import {uploadRequest} from "@/lib/entries/upload-client";
import {UploadOperationError} from "@/lib/entries/upload-errors";
import {settleStaleUploads,staleUploads} from "@/lib/entries/stale-uploads";
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
/** A list row's strip: small square tiles in one line that runs off the sheet's right edge and scrolls sideways. */
const stripClass="-mr-5 grid snap-x grid-flow-col auto-cols-[4.75rem] justify-start gap-1.5 overflow-x-auto pr-5 [scrollbar-width:none] sm:-mr-8 sm:pr-8 md:mr-0 md:pr-0 [&::-webkit-scrollbar]:hidden";

/** Holds a strip's place until its photographs are read. Nothing when the count is unknown or none. */
export function PreviewStripSkeleton({count}:{count?:number}){
 if(!count)return null;
 return <div aria-hidden="true" className={stripClass}>{Array.from({length:Math.min(count,6)},(_,i)=><span key={i} className="media-skeleton aspect-square rounded-control"/>)}</div>;
}

export function MediaCollection({access,initial=[],onCount,separated=false,entryTitle="",entryDate="",previewOnly=false,leadTile=true,expect}:{previewOnly?:boolean;
 /** With `previewOnly`: how many photographs to hold room for while they are read. */
 expect?:number;access:EntryAccess;initial?:QueuedPhoto[];onCount?:(n:number)=>void;separated?:boolean;entryTitle?:string;entryDate?:string;leadTile?:boolean}){
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
 // Reservations whose upload window closed long ago still count toward this
 // entry's limits. Each is asked to finish once per visit: a file that did
 // arrive is published, and an empty reservation is released.
 const owner=useUploadOwner(),swept=useRef(new Set<string>()),sweeping=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const stale=editable&&!previewSession&&uploads.ready&&!loading?staleUploads(media,inFlight as Set<string>).map(m=>m.id).join(","):"";
 useEffect(()=>{
  if(!stale||!owner||sweeping.current)return;
  const rows=stale.split(",").filter(fileId=>!swept.current.has(fileId)).map(fileId=>({id:fileId}) as EntryMedia);
  if(!rows.length)return;
  sweeping.current=true;
  void settleStaleUploads(rows,async(operation,fileId)=>{
   if(!alive.current)return {error:"Stopped.",retryable:true};
   if(operation==="finalize")swept.current.add(fileId);
   try{await uploadRequest({operation,kind,memoryId:id,id:fileId},owner);return {};}
   catch(problem){return {error:problem instanceof Error?problem.message:"Unavailable.",retryable:problem instanceof UploadOperationError&&problem.recoverable};}
  }).then(result=>{sweeping.current=false;if(alive.current&&result.published+result.released)void reload();});
 },[stale,owner,kind,id,reload]);
 // The detail page may already be showing this entry's first photo as a hero,
 // in which case promoting it again here would print it twice at two sizes.
 const lead=leadTile&&!previewOnly&&shown.length>2&&!adding&&!unfinished.length;
 async function accept(files:File[]){
  if(!editable||!files.length)return;
  try{await uploads.add(files);setError("");}
  catch(problem){setError(problem instanceof Error?problem.message:"Those files couldn't be added.");}
 }
 async function settle(fileId:string,operation:"remove"|"finalize"){setPending(true);try{if(previewSession)await changePreviewMedia(access,fileId);else{const r=await memoryMediaAction({operation,kind,memoryId:id,id:fileId});if(r.error)throw Error(r.error);}await reload();}catch(e){setError(e instanceof Error?e.message:"That file couldn't be changed. Try again.");}finally{setPending(false);}}
 const grid=ready.length||adding||unfinished.length;
 const galleryHref="/gallery?kind="+kind+"&entry="+id;
 return <section id={previewOnly?undefined:"photos"} className={(previewOnly?"":"mt-10")+(separated?" border-t pt-8":"")} aria-label="Photos and videos">
 {!previewOnly?<div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-display text-section-title">Photos and videos</h2><p className="mt-2 text-sm text-muted-foreground">{ready.length?summary(photos.length,videos.length):"A place for the little things you captured."}</p></div>{ready.length?<Link className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href={galleryHref}>Open gallery<span className="sr-only"> from {entryTitle||kind}</span></Link>:null}</div>:null}
 {loading?previewOnly?<PreviewStripSkeleton count={expect}/>:<p role="status" className="mt-5 text-muted-foreground">Loading photos…</p>:null}
 {error?<div className={(previewOnly?"mt-2":"mt-5")+" space-y-3"}><p role="alert" className="status-message status-error">{error}</p>{!previewOnly&&!media.length?<Button variant="outline" onClick={()=>void reload()}>Try again</Button>:null}</div>:null}
 {editable&&uploads.error?<div className="mt-5 space-y-3"><p role="alert" className="status-message status-error">{uploads.error}</p><Button variant="outline" onClick={uploads.recover}>Try opening uploads again</Button></div>:null}
 <div
  onDragOver={event=>{if(editable&&event.dataTransfer.types.includes("Files")){event.preventDefault();setDropping(true);}}}
  onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setDropping(false);}}
  onDrop={event=>{if(!editable)return;event.preventDefault();setDropping(false);accept(Array.from(event.dataTransfer.files));}}
  className={cn(previewOnly?null:"mt-5","rounded-panel transition-colors duration-200 motion-reduce:transition-none",dropping?"outline-2 outline-dashed outline-offset-4 outline-rose":null)}
 >
  {previewOnly
   ?shown.length?<div aria-label="Photo and video preview" className={stripClass}>
     {shown.map((m,i)=><MediaTile key={m.id} dense item={m} eager={i<3} label={"Open photo "+(ready.indexOf(m)+1)} onOpen={()=>setSelected(m.id)} className="snap-start"/>)}
    </div>:null
   :grid
   ?<div aria-label="Photo and video preview" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
     {shown.map((m,i)=><MediaTile key={m.id} item={m} eager={i<3} label={"Open "+(m.media_type==="image"?"photo":"video")+" "+(ready.indexOf(m)+1)} onOpen={()=>setSelected(m.id)} className={lead&&i===0?"col-span-2 row-span-2":undefined}/>)}
     {editable?unfinished.map(m=><UnfinishedTile key={m.id} media={m} busy={pending} onRetry={()=>void settle(m.id,"finalize")} onRemove={()=>void settle(m.id,"remove")}/>):null}
     {editable?uploads.items.map((item,i)=><UploadTile key={item.key} item={item} position={i+1} total={uploads.items.length} paused={uploads.paused} waiting={uploads.waiting} offline={uploads.offline} onRetry={()=>uploads.retry(item.key)} onRemove={()=>void uploads.remove(item.key)}/>):null}
     {editable?<PhotoChooser tile disabled={!uploads.ready} onFiles={accept} onError={setError}/>:null}
    </div>
   :!loading?<div className="max-w-sm"><PhotoChooser disabled={!uploads.ready} onFiles={accept} onError={setError}/></div>:null}
 </div>
 {previewOnly&&ready.length>shown.length?<Link className="inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" href={galleryHref}>View all {ready.length} files<span className="sr-only"> from {entryTitle||kind}</span></Link>:null}
 {editable?<UploadProgress items={uploads.items} paused={uploads.paused} waiting={uploads.waiting} offline={uploads.offline} completed={uploads.completed} total={uploads.total} onPause={()=>void uploads.pause()} onResume={()=>void uploads.resume()} onRetry={()=>void uploads.retry()}/>:null}
 {editable&&adding?<p className="mt-3 text-sm leading-6 text-muted-foreground">Unfinished files stay on this device for up to 24 hours. Reopen this entry to continue. Keep the app open while they send.</p>:null}
 {access.previewSession&&adding?<p className="mt-3 text-sm leading-6 text-muted-foreground">Preview photos stay in this browser for up to 24 hours. They are not uploaded to your shared account.</p>:null}
 {index>=0?<MediaViewer items={ready} index={index} onIndex={i=>setSelected(ready[i].id)} onClose={()=>setSelected(null)} onChange={reload}/>:null}
 </section>;
}
