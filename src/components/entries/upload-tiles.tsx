"use client";
import {CircleAlert,Film,Image as ImageIcon,Pause,Play,RotateCw,X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {isImage} from "@/lib/memories/media";
import {summarize,type UploadItem} from "@/lib/entries/upload-queue";
import type {EntryMedia} from "@/lib/entries/types";
import {cn} from "@/lib/utils";
import {LocalPreview} from "./photo-picker";

const corner="absolute right-0 top-0 z-20 grid size-11 place-items-center rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-55";

function RemoveButton({label,onClick,disabled}:{label:string;onClick:()=>void;disabled?:boolean}){
 return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={corner}>
  <span className="grid size-7 place-items-center rounded-full bg-black/60 text-white"><X className="size-4" aria-hidden="true"/></span>
 </button>;
}

/**
 * A file on its way into the collection, shown in the tile it will occupy.
 *
 * The photo develops as it sends: it starts muted and grey and gains its
 * colour with the transfer, the way a print comes up in the tray, with a thin
 * wine line along the bottom edge for anyone who wants the number. That is
 * the one moving thing here, and with reduced motion it simply steps.
 */
export function UploadTile({item,position,total,paused,waiting,onRetry,onRemove}:{
 item:UploadItem;
 position:number;
 total:number;
 paused:boolean;
 waiting:boolean;
 onRetry:()=>void;
 onRemove:()=>void;
}){
 const kind=isImage(item.mime)?"photo":"video";
 const name=kind+" "+position+" of "+total;
 const failed=item.status==="failed",finishing=item.status==="processing",sending=item.status==="sending";
 const held=(paused||waiting||item.status==="waiting")&&!failed&&!finishing;
 const developed=failed?0.15:finishing?1:item.progress/100;
 const label=failed?"Couldn't add":finishing?"Finishing…":held?(paused?"Paused":"Waiting"):sending?(item.progress?item.progress+"%":"Starting"):"Up next";
 const state=failed?"couldn't be added. "+item.error:finishing?"finishing":held?(paused?"paused":"waiting for a connection"):sending?(item.progress?item.progress+" percent sent":"starting"):"waiting its turn";

 return <figure role="group" aria-label={name+", "+state} className="min-w-0" data-upload-state={item.status}>
  <div className="relative aspect-square overflow-hidden rounded-panel bg-secondary">
   <LocalPreview
    file={item.file}
    mime={item.mime}
    className="transition-[filter,opacity] duration-500 ease-out motion-reduce:transition-none"
    style={{filter:`grayscale(${0.85*(1-developed)}) brightness(${0.88+0.12*developed})`,opacity:0.72+0.28*developed}}
   />
   <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
    <span className={cn("block h-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none",finishing&&"upload-finishing")} style={{width:(failed?0:finishing?100:item.progress)+"%"}}/>
   </span>
   {failed
    ?<button type="button" onClick={onRetry} aria-label={"Try adding "+name+" again. "+item.error} className="absolute inset-0 z-10 grid content-center justify-items-center gap-1.5 bg-card/80 p-2 text-center text-xs font-semibold leading-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
      <CircleAlert className="size-5 text-danger" aria-hidden="true"/>
      <span>Couldn&apos;t add</span>
      <span className="inline-flex items-center gap-1 text-primary"><RotateCw className="size-3.5" aria-hidden="true"/>Try again</span>
     </button>
    :<span aria-hidden="true" className="absolute bottom-2.5 left-2 inline-flex items-center gap-1 rounded-control bg-black/60 px-1.5 py-0.5 text-xs font-semibold leading-4 text-white">
      {held&&paused?<Pause className="size-3 fill-current"/>:null}{label}
     </span>}
   {!finishing?<RemoveButton label={"Remove "+name} onClick={onRemove}/>:null}
  </div>
  {failed?<figcaption className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.error}</figcaption>:null}
 </figure>;
}

/**
 * A file this person started on another visit that never finished. Only the
 * person who added it sees it; their partner never meets someone else's
 * half-sent file.
 */
export function UnfinishedTile({media,busy,onRetry,onRemove}:{media:EntryMedia;busy:boolean;onRetry:()=>void;onRemove:()=>void}){
 const kind=media.media_type==="image"?"photo":"video";
 const Mark=media.media_type==="image"?ImageIcon:Film;
 const failed=media.state==="failed";
 return <figure role="group" aria-label={"A "+kind+" that didn't finish"} className="min-w-0">
  <div className="relative aspect-square overflow-hidden rounded-panel border border-dashed border-primary/35 bg-secondary/60">
   <button type="button" disabled={busy} onClick={onRetry} aria-label={"Finish adding this "+kind} className="absolute inset-0 z-10 grid content-center justify-items-center gap-1.5 p-2 text-center text-xs font-semibold leading-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-55">
    <Mark className="size-5 text-primary" aria-hidden="true"/>
    <span>{failed?"Couldn't finish":"Didn't finish"}</span>
    <span className="inline-flex items-center gap-1 text-primary"><RotateCw className="size-3.5" aria-hidden="true"/>Try again</span>
   </button>
   <RemoveButton label={"Remove this unfinished "+kind} disabled={busy} onClick={onRemove}/>
  </div>
 </figure>;
}

/** One line for the whole batch, and the one control a person needs: Pause. */
export function UploadProgress({items,paused,waiting,completed=0,total=items.length,onPause,onResume,onRetry}:{items:UploadItem[];paused:boolean;waiting:boolean;completed?:number;total?:number;onPause:()=>void;onResume:()=>void;onRetry:()=>void}){
 const summary=summarize(items,{paused,waiting});
 if(!items.length)return null;
 const heading=summary.title||summary.detail;
 const deferred=items.filter(item=>item.status==="waiting").length;
 return <div className="mt-4 flex flex-wrap items-center gap-3 rounded-panel bg-secondary/60 py-2 pl-4 pr-2">
  <div role="status" className="min-w-0 flex-1 py-1">
   <p className="text-sm font-semibold leading-5">{heading}</p>
   <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{completed} of {total} saved · {items.filter(item=>item.status==="sending").length} uploading · {items.filter(item=>item.status==="processing").length} finishing{deferred?` · ${deferred} waiting to retry`:""}</p>
   {summary.title&&summary.detail?<p className="mt-0.5 text-xs leading-5 text-muted-foreground">{summary.detail}</p>:null}
   {summary.active?<span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-primary/15"><span className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{width:summary.progress+"%"}}/></span>:null}
  </div>
  <div className="flex flex-wrap gap-2">
  {summary.failed||deferred?<Button type="button" size="sm" variant="outline" className="h-11" onClick={onRetry}>Retry remaining</Button>:null}
  {summary.active
   ?paused
    ?<Button type="button" size="sm" className="h-11 shrink-0" onClick={onResume}><Play className="size-4 fill-current" aria-hidden="true"/>Continue</Button>
    :<Button type="button" size="sm" variant="outline" className="h-11 shrink-0" onClick={onPause}><Pause className="size-4" aria-hidden="true"/>Pause</Button>
   :null}
  </div>
 </div>;
}
