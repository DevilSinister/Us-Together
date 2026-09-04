"use client";
import { usePartnerRefresh } from "@/components/providers/partner-sync";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {entryMedia} from "@/app/actions/entries";
import {memoryMediaAction} from "@/app/actions/memories";
import {previewMedia,changePreviewMedia} from "@/lib/entries/preview-media";
import type {EntryAccess,EntryMedia} from "@/lib/entries/types";
import type {GalleryItem} from "@/lib/entries/gallery";
import {EntryUploader} from "./uploader";
import type {QueuedPhoto} from "./photo-picker";
import {Button} from "@/components/ui/button";
import {CommentThread} from "./comment-thread";
import {MediaViewer} from "./media-viewer";
import {MediaTile} from "./media-tile";
function summary(photos:number,videos:number){
 const parts=[];
 if(photos)parts.push(photos+(photos===1?" photo":" photos"));
 if(videos)parts.push(videos+(videos===1?" video":" videos"));
 return parts.join(" · ");
}
export function MediaCollection({access,initial=[],onCount,separated=false,entryTitle="",entryDate="",previewOnly=false}:{previewOnly?:boolean;access:EntryAccess;initial?:QueuedPhoto[];onCount?:(n:number)=>void;separated?:boolean;entryTitle?:string;entryDate?:string}){
 const [media,setMedia]=useState<EntryMedia[]>([]),[error,setError]=useState(""),[pending,setPending]=useState(false),[loading,setLoading]=useState(true),[selected,setSelected]=useState<string|null>(null);
 const urls=useRef<string[]>([]),countCallback=useRef(onCount);const {kind,id,previewSession}=access;
 useEffect(()=>{countCallback.current=onCount;},[onCount]);
 const reload=useCallback(async()=>{try{const a={kind,id,previewSession};let files:EntryMedia[];
 if(previewSession)files=await previewMedia(a);else{const r=await entryMedia(a);if(r.error)throw Error(r.error);files=r.media??[];}
 for(const u of urls.current)URL.revokeObjectURL(u);urls.current=files.flatMap(m=>[m.url,m.previewUrl].filter((x):x is string=>!!x));setMedia(files);countCallback.current?.(files.length);setError("");
 }catch(e){setError(e instanceof Error?e.message:"Could not load files.");}finally{setLoading(false);}},[kind,id,previewSession]);
 useEffect(()=>{const timer=setTimeout(()=>void reload(),0);return()=>{clearTimeout(timer);for(const u of urls.current)URL.revokeObjectURL(u);};},[reload]);
 usePartnerRefresh(reload,pending || loading || !!previewSession);
 const ready:GalleryItem[]=media.filter(m=>m.state==="ready").map(m=>({...m,access,entryTitle,entryDate,sortKey:kind+":"+m.id}));
 const photos=ready.filter(m=>m.media_type==="image"),videos=ready.filter(m=>m.media_type==="video");
 const shown=(previewOnly?photos:[...photos,...videos]).slice(0,6),index=ready.findIndex(m=>m.id===selected);
 const lead=!previewOnly&&shown.length>2;
 async function unfinished(fileId:string,operation:"remove"|"finalize"){setPending(true);try{if(previewSession)await changePreviewMedia(access,fileId);else{const r=await memoryMediaAction({operation,kind,memoryId:id,id:fileId});if(r.error)throw Error(r.error);}await reload();}catch(e){setError(e instanceof Error?e.message:"Could not update file.");}finally{setPending(false);}}
 return <section id={previewOnly?undefined:"photos"} className={(previewOnly?"mt-4":"mt-10")+(separated?" border-t pt-8":"")} aria-label="Photos and videos">
 <div className="flex flex-wrap items-end justify-between gap-3"><div>{!previewOnly?<h2 className="font-display text-3xl">Photos and videos</h2>:null}<p className="mt-2 text-sm text-muted-foreground">{ready.length?summary(photos.length,videos.length):previewOnly?"":"A place for the little things you captured."}</p></div>{ready.length?<Button asChild variant="outline"><Link href={"/gallery?kind="+kind+"&entry="+id}>Show more<span className="sr-only"> from {entryTitle||kind}</span></Link></Button>:null}</div>
 {loading?<p role="status" className="mt-5 text-muted-foreground">Loading photos…</p>:null}
 {error?<div className="mt-5"><p role="alert" className="status-message status-error">{error}</p><Button variant="outline" onClick={()=>void reload()}>Try again</Button></div>:null}
 <div aria-label="Photo and video preview" className={"mt-5 grid gap-3 "+(previewOnly?"grid-cols-3":"grid-cols-3 sm:grid-cols-4")}>{shown.map((m,i)=><MediaTile key={m.id} item={m} eager={i<3} label={"Open "+(m.media_type==="image"?"photo":"video")+" "+(ready.indexOf(m)+1)} onOpen={()=>setSelected(m.id)} className={lead&&i===0?"col-span-2 row-span-2":undefined}/>)}</div>
 {!loading&&ready.length>shown.length?<p className="mt-4 text-sm text-muted-foreground">{ready.length-shown.length} more in the full gallery.</p>:null}
 {!previewOnly?<EntryUploader access={access} initial={initial} onChange={reload}/>:null}
 {!previewOnly?media.filter(m=>m.state!=="ready").map(m=><div key={m.id} className="mt-4 rounded-control border p-4"><p className="text-sm font-semibold">{m.state==="failed"?"This upload could not be processed.":"Unfinished upload"}</p><p className="mt-1 text-sm text-muted-foreground">{m.state==="failed"?"Finish processing to try again, or remove it.":"Status: "+m.state}</p><div className="mt-3 flex gap-3">{m.state!=="deleting"?<Button variant="outline" disabled={pending} onClick={()=>void unfinished(m.id,"finalize")}>Finish processing</Button>:null}<Button variant="outline" disabled={pending} onClick={()=>void unfinished(m.id,"remove")}>Remove unfinished upload</Button></div></div>):null}
 {!previewOnly?<CommentThread key={kind+id} access={access}/>:null}
 {index>=0?<MediaViewer items={ready} index={index} onIndex={i=>setSelected(ready[i].id)} onClose={()=>setSelected(null)} onChange={reload}/>:null}
 </section>;
}
