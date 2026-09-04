"use client";
import {useState} from "react";
import Image from "next/image";
import {Film, ImageOff, Play} from "lucide-react";
import type {GalleryItem} from "@/lib/entries/gallery";
import {mediaSource} from "./media-viewer";
import {cn} from "@/lib/utils";

function clock(seconds:number|null){
 const total=Math.round(Number(seconds??0));
 if(!Number.isFinite(total)||total<1)return "";
 return Math.floor(total/60)+":"+String(total%60).padStart(2,"0");
}

/**
 * One photo or video tile.
 *
 * A plain element owns the aspect ratio and the positioning context, and the
 * control sits over it as an overlay. A form control is an unreliable
 * aspect-ratio container, and when its box collapses a lazily loaded image
 * never intersects the viewport, so it is never fetched and the tile stays
 * blank. `eager` opts the first visible tiles out of lazy loading entirely.
 */
export function MediaTile({item,label,eager=false,onOpen,ratio="square",className}:{
 item:GalleryItem;
 label:string;
 eager?:boolean;
 onOpen:()=>void;
 ratio?:"square"|"wide";
 className?:string;
}){
 const image=item.media_type==="image";
 const [status,setStatus]=useState<"loading"|"ready"|"error">(image?"loading":"ready");
 const length=clock(item.duration_seconds);

 return <figure className={cn("min-w-0",className)}>
  <div className={cn("group relative w-full overflow-hidden rounded-panel bg-secondary",ratio==="wide"?"aspect-[4/3]":"aspect-square")}>
   {image&&status!=="error"?<Image
    src={mediaSource(item,"preview")}
    alt={item.caption||item.entryTitle||"Photo"}
    fill
    unoptimized
    sizes={ratio==="wide"?"(max-width:640px) 100vw, 40vw":"(max-width:640px) 33vw, 17vw"}
    loading={eager?"eager":"lazy"}
    decoding="async"
    referrerPolicy="no-referrer"
    className={cn("object-cover transition-opacity duration-500 motion-reduce:transition-none",status==="ready"?"opacity-100":"opacity-0")}
    onLoad={()=>setStatus("ready")}
    onError={()=>setStatus("error")}
   />:null}

   {image&&status==="loading"?<span aria-hidden="true" className="media-skeleton absolute inset-0"/>:null}

   {image&&status==="error"?<span className="absolute inset-0 grid content-center justify-items-center gap-2 p-3 text-center text-xs leading-5 text-muted-foreground">
    <ImageOff className="size-5" aria-hidden="true"/>Photo unavailable
   </span>:null}

   {!image?<>
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-primary"><Play className="size-8 fill-current"/></span>
    <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-xs font-semibold text-white">
     <Film className="size-3.5 shrink-0" aria-hidden="true"/>{length||"Video"}
    </span>
   </>:null}

   <button
    type="button"
    aria-label={label}
    onClick={onOpen}
    className="absolute inset-0 z-10 rounded-panel transition-[background-color] group-hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none"
   />
  </div>
  {item.caption?<figcaption className="mt-2 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{item.caption}</figcaption>:null}
 </figure>;
}
