"use client";
import {useEffect,useId,useMemo,useState} from "react";
import Image from "next/image";
import {Film,ImagePlus,X} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {validateUpload} from "@/lib/memories/media";
import {cn} from "@/lib/utils";

export type QueuedPhoto={key:string;file:File;caption:string};

const LIMIT=30;
const ACCEPT="image/jpeg,image/png,video/mp4,video/webm";
export const photoLimits="JPEG or PNG up to 5 MB, MP4 or WebM up to 20 MB. Up to "+LIMIT+" files at once.";

/** Adds files to a queue, rejecting the whole batch when one file cannot be kept. */
export function queueFiles(current:QueuedPhoto[],incoming:File[]):QueuedPhoto[]{
 if(!incoming.length)return current;
 if(current.length+incoming.length>LIMIT)throw Error("Choose up to "+LIMIT+" files at once.");
 for(const file of incoming)validateUpload(file.name,file.type,file.size);
 return [...current,...incoming.map(file=>({key:crypto.randomUUID(),file,caption:""}))];
}

function weight(bytes:number){
 return bytes>=1024*1024?(bytes/1024/1024).toFixed(1)+" MB":Math.max(1,Math.round(bytes/1024))+" KB";
}

/**
 * One queued file's thumbnail. The object URL is made per row and revoked when
 * that row leaves, so editing a caption never rebuilds the other thumbnails.
 */
function Thumbnail({file}:{file:File}){
 const url=useMemo(()=>file.type.startsWith("image/")?URL.createObjectURL(file):"",[file]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 return <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-secondary">
  {url
   ?<Image src={url} alt="" fill unoptimized sizes="56px" className="object-cover"/>
   :<span aria-hidden="true" className="absolute inset-0 grid place-items-center text-primary"><Film className="size-5"/></span>}
 </span>;
}

/**
 * The control that opens the file picker.
 *
 * `tile` renders it as a square cell so it can sit as the last item of a media
 * grid; the default renders the wider chooser used by a standalone form. The
 * input stays a real focusable control behind the label so the keyboard path
 * matches the pointer one.
 */
export function PhotoChooser({value,onChange,onError,disabled=false,tile=false,label,className}:{
 value:QueuedPhoto[];
 onChange:(files:QueuedPhoto[])=>void;
 onError?:(message:string)=>void;
 disabled?:boolean;
 tile?:boolean;
 label?:string;
 className?:string;
}){
 const id=useId();
 const [error,setError]=useState("");
 function report(message:string){setError(message);onError?.(message);}
 return <div className={cn("min-w-0",className)}>
  <input
   id={id}
   type="file"
   multiple
   accept={ACCEPT}
   disabled={disabled}
   aria-describedby={id+"-limits"}
   className="peer sr-only"
   onChange={event=>{
    try{onChange(queueFiles(value,Array.from(event.target.files??[])));report("");}
    catch(problem){report(problem instanceof Error?problem.message:"Could not add those files.");}
    event.target.value="";
   }}
  />
  <Label
   htmlFor={id}
   className={cn(
    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border border-border bg-secondary/50 px-3 text-center text-secondary-foreground transition-colors duration-200 hover:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-55 motion-reduce:transition-none",
    tile?"aspect-square w-full":"min-h-32 py-6",
   )}
  >
   <ImagePlus className="size-6 text-primary" aria-hidden="true"/>
   <span className={cn("font-semibold leading-5",tile?"text-xs":"text-sm")}>{label??(tile?"Add photos":"Choose photos or videos")}</span>
  </Label>
  <p id={id+"-limits"} className={tile?"sr-only":"mt-3 text-sm leading-6 text-muted-foreground"}>{photoLimits}</p>
  {error&&!onError?<p role="alert" className="status-message status-error mt-3">{error}</p>:null}
 </div>;
}

/** The chosen-but-not-yet-sent files, each with its own caption. */
export function PhotoQueue({value,onChange,disabled=false,className}:{
 value:QueuedPhoto[];
 onChange:(files:QueuedPhoto[])=>void;
 disabled?:boolean;
 className?:string;
}){
 const id=useId();
 if(!value.length)return null;
 return <div className={cn("rounded-panel border bg-card p-4 sm:p-5",className)}>
  <p role="status" className="text-sm font-semibold">{value.length===1?"1 file ready":value.length+" files ready"}</p>
  <ul className="mt-4 divide-y">{value.map((item,index)=>
   <li key={item.key} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
    <Thumbnail file={item.file}/>
    <span className="min-w-0 flex-1">
     <span className="block truncate text-sm font-semibold" title={item.file.name}>{item.file.name}</span>
     <span className="block text-xs text-muted-foreground">{weight(item.file.size)}</span>
     <Label htmlFor={id+"-caption-"+index} className="sr-only">Caption for {item.file.name}</Label>
     <Input
      id={id+"-caption-"+index}
      value={item.caption}
      maxLength={240}
      disabled={disabled}
      placeholder="Add a caption"
      className="mt-2 h-11 text-sm"
      onChange={event=>onChange(value.map(file=>file.key===item.key?{...file,caption:event.target.value}:file))}
     />
    </span>
    <button
     type="button"
     disabled={disabled}
     aria-label={"Remove "+item.file.name}
     onClick={()=>onChange(value.filter(file=>file.key!==item.key))}
     className="grid size-11 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none"
    ><X className="size-4" aria-hidden="true"/></button>
   </li>,
  )}</ul>
 </div>;
}

/** Chooser and queue together, for forms that collect files before an entry exists. */
export function PhotoPicker({value,onChange,disabled=false,legend="Photos and videos"}:{
 legend?:string;
 value:QueuedPhoto[];
 onChange:(files:QueuedPhoto[])=>void;
 disabled?:boolean;
}){
 return <fieldset className="space-y-4" disabled={disabled}>
  <legend className="font-display text-2xl">{legend}</legend>
  <PhotoChooser value={value} onChange={onChange} disabled={disabled}/>
  <PhotoQueue value={value} onChange={onChange} disabled={disabled}/>
 </fieldset>;
}
