"use client";
import {useEffect,useRef,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {ImageOff, X} from "lucide-react";
import type {GalleryItem} from "@/lib/entries/gallery";
import {memoryMediaAction} from "@/app/actions/memories";
import {changePreviewMedia} from "@/lib/entries/preview-media";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {CommentThread} from "./comment-thread";
export function mediaSource(item:GalleryItem,variant="original"){return (variant==="preview"?item.previewUrl:item.url)??"/api/memory-media/"+item.id+"?kind="+item.access.kind+"&variant="+variant;}
export function MediaViewer({items,index,onIndex,onClose,onChange}:{items:GalleryItem[];index:number;onIndex:(i:number)=>void;onClose:()=>void;onChange:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),item=items[index],touch=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} onClose={onClose} onCancel={onClose} onKeyDown={e=>{if(e.target instanceof Element&&e.target.closest("video,input,textarea,select"))return;if(e.key==="ArrowLeft"){e.preventDefault();onIndex((index+items.length-1)%items.length);}if(e.key==="ArrowRight"){e.preventDefault();onIndex((index+1)%items.length);}}} className="fixed inset-0 m-auto max-h-[95dvh] w-[min(96vw,76rem)] max-w-none overflow-auto rounded-panel border bg-background p-4 text-foreground backdrop:bg-black/70 sm:p-6" aria-label="Media viewer">
 <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6"><p className="text-sm">{index+1} of {items.length}</p><Button variant="outline" aria-label="Close viewer" onClick={onClose}><X/></Button></div>
 {item?<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="min-w-0">{item.media_type==="image"?<div aria-label="Swipe photo" className="relative h-[42dvh] overflow-hidden rounded-panel bg-secondary lg:h-[65dvh]" style={{touchAction:"pan-y pinch-zoom"}} onTouchStart={e=>{touch.current=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;}} onTouchCancel={()=>{touch.current=null;}} onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start||e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>=50&&Math.abs(dx)>Math.abs(dy)*1.5)onIndex((index+(dx<0?1:items.length-1))%items.length);}}><FullImage item={item}/></div>:<video key={item.id} controls playsInline preload="metadata" className="max-h-[65dvh] w-full rounded-panel bg-secondary" src={mediaSource(item)} aria-label={item.caption||"Selected video"}><track kind="captions"/></video>}
 <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" disabled={items.length<2} onClick={()=>onIndex((index+items.length-1)%items.length)}>Previous</Button><Button variant="outline" disabled={items.length<2} onClick={()=>onIndex((index+1)%items.length)}>Next</Button><a href={mediaSource(item,"download")} download={item.access.previewSession?"download":undefined} referrerPolicy="no-referrer" className="inline-flex min-h-11 items-center font-semibold text-primary">Download file</a></div></div>
 <div className="min-w-0"><Link href={(item.access.kind==="memory"?"/memories/":"/milestones/")+item.access.id} className="inline-flex min-h-11 items-center break-words font-display text-2xl text-primary hover:underline">{item.entryTitle||"Open "+item.access.kind}</Link>{item.entryDate?<p className="mt-1 text-sm text-muted-foreground">{new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"}).format(new Date(item.entryDate+"T00:00:00Z"))}</p>:null}
 <p className="mt-4 whitespace-pre-wrap break-words leading-7">{item.caption||"No caption yet."}</p>
 <FileOptions key={item.access.kind+item.id} item={item} onChange={onChange} onRemove={onClose}/>
 <CommentThread key={item.access.kind+item.id+"comments"} access={item.access} mediaId={item.id}/></div></div>:null}</dialog>;
}
function FullImage({item}:{item:GalleryItem}){
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 if(status==="error")return <span className="absolute inset-0 grid content-center justify-items-center gap-2 p-4 text-center text-sm text-muted-foreground"><ImageOff className="size-6" aria-hidden="true"/>This photo could not be opened.</span>;
 return <>
  {status==="loading"?<span aria-hidden="true" className="media-skeleton absolute inset-0"/>:null}
  <Image src={mediaSource(item)} fill unoptimized sizes="(max-width:1024px) 95vw, 65vw" alt={item.caption||"Selected photo"} referrerPolicy="no-referrer" onLoad={()=>setStatus("ready")} onError={()=>setStatus("error")} className={"object-contain transition-opacity duration-300 motion-reduce:transition-none "+(status==="ready"?"opacity-100":"opacity-0")}/>
 </>;
}
function FileOptions({item,onChange,onRemove}:{item:GalleryItem;onChange:()=>Promise<void>;onRemove:()=>void}){
 const [pending,setPending]=useState(false),[error,setError]=useState("");
 async function mutate(operation:"caption"|"remove",caption?:string){setPending(true);try{if(item.access.previewSession)await changePreviewMedia(item.access,item.id,caption);else{const r=await memoryMediaAction({operation,kind:item.access.kind,memoryId:item.access.id,id:item.id,caption});if(r.error)throw Error(r.error);}if(operation==="remove")onRemove();await onChange();setError("");}catch(e){setError(e instanceof Error?e.message:"Could not update file.");}finally{setPending(false);}}
 return <details className="mt-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary">Caption and file options</summary>{error?<p role="alert" className="status-message status-error">{error}</p>:null}<form onSubmit={e=>{e.preventDefault();void mutate("caption",String(new FormData(e.currentTarget).get("caption")??""));}} className="space-y-3"><Label htmlFor={"caption-"+item.id}>Caption</Label><Input id={"caption-"+item.id} name="caption" defaultValue={item.caption} maxLength={240}/><Button variant="outline" disabled={pending}>Save caption</Button></form><p className="mt-4 text-sm text-muted-foreground">Removing this file permanently deletes it and its comments.</p><Button variant="ghost" disabled={pending} onClick={()=>void mutate("remove")}>Remove file</Button></details>;
}
