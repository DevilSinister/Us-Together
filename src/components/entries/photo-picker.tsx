"use client";
import {useEffect,useId,useState} from "react";
import Image from "next/image";
import {Film,Image as ImageIcon,ImagePlus,X} from "lucide-react";
import {Label} from "@/components/ui/label";
import {acceptAttribute,acceptedMedia,isImage,rendersInBrowser,resolveMime,validateUpload} from "@/lib/memories/media";
import type {QueuedPhoto} from "@/lib/entries/upload-queue";
import {cn} from "@/lib/utils";
import {VideoThumbnail} from "./video-thumbnail";

export type {QueuedPhoto};

const LIMIT=30;
export const photoLimits=acceptedMedia+" Up to "+LIMIT+" at a time.";

/**
 * Adds files to a queue, rejecting the whole batch when one file cannot be kept.
 *
 * Each file's type is resolved from its name when the browser reports nothing
 * useful, and that resolved type — not the browser's — is what gets uploaded.
 */
export function queueFiles(current:QueuedPhoto[],incoming:File[]):QueuedPhoto[]{
 if(!incoming.length)return current;
 if(current.length+incoming.length>LIMIT)throw Error("You can add up to "+LIMIT+" at a time. Let these finish, then add the rest.");
 const queued=incoming.map(file=>{
  const mime=resolveMime(file.name,file.type);
  validateUpload(file.name,mime,file.size);
  return {key:crypto.randomUUID(),file,caption:"",mime};
 });
 return [...current,...queued];
}

/**
 * The picture of a file still on this device, filling its tile.
 *
 * The object URL is made per tile and revoked when that tile leaves, so a
 * change elsewhere in the grid never rebuilds it. A HEIC photo gets the still
 * mark rather than a broken image: it uploads fine, but no browser outside
 * Safari can paint it before the server has made its preview.
 */
export function LocalPreview({file,mime,className,style}:{file:File;mime:string;className?:string;style?:React.CSSProperties}){
 const image=isImage(mime);
 const paintable=rendersInBrowser(mime)||!image;
 const [url,setUrl]=useState("");
 useEffect(()=>{
  if(!paintable)return;
  const source=URL.createObjectURL(file);
  const timer=setTimeout(()=>setUrl(source),0);
  return()=>{clearTimeout(timer);URL.revokeObjectURL(source);};
 },[file,paintable]);
 const Mark=image?ImageIcon:Film;
 return <span aria-hidden="true" className={cn("absolute inset-0 block",className)} style={style}>
  {url
   ?!image?<VideoThumbnail src={url} eager/>:<Image src={url} alt="" fill unoptimized sizes="(max-width:640px) 33vw, 17vw" className="object-cover"/>
   :<span className="absolute inset-0 grid place-items-center text-primary"><Mark className="size-6"/></span>}
 </span>;
}

/**
 * The control that opens the file picker.
 *
 * `tile` renders it as a square cell so it can sit as the last item of a media
 * grid; the default renders the wider chooser used when nothing is there yet.
 * The input stays a real focusable control behind the label so the keyboard
 * path matches the pointer one. `onFiles` receives the raw files and throws a
 * sentence when they cannot be kept.
 */
export function PhotoChooser({onFiles,onError,disabled=false,tile=false,label,className}:{
 onFiles:(files:File[])=>void;
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
   accept={acceptAttribute}
   disabled={disabled}
   aria-describedby={id+"-limits"}
   className="peer sr-only"
   onChange={event=>{
    try{onFiles(Array.from(event.target.files??[]));report("");}
    catch(problem){report(problem instanceof Error?problem.message:"Those files couldn't be added.");}
    event.target.value="";
   }}
  />
  <Label
   htmlFor={id}
   className={cn(
    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-primary/35 bg-secondary/50 px-3 text-center text-secondary-foreground transition-colors duration-200 hover:border-primary/60 hover:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-55 motion-reduce:transition-none",
    tile?"aspect-square w-full":"min-h-32 py-6",
   )}
  >
   <ImagePlus className="size-6 text-primary" aria-hidden="true"/>
   <span className={cn("font-semibold leading-5",tile?"text-xs":"text-sm")}>{label??(tile?"Add more":"Add photos or videos")}</span>
  </Label>
  <p id={id+"-limits"} className={tile?"sr-only":"mt-3 text-sm leading-6 text-muted-foreground"}>{photoLimits}</p>
  {error&&!onError?<p role="alert" className="status-message status-error mt-3">{error}</p>:null}
 </div>;
}

/**
 * Chosen files for an entry that has not been saved yet, as the tiles they
 * will become. They start sending the moment the entry is saved; captions are
 * written afterwards, on the photo itself.
 */
export function PhotoPicker({value,onChange,disabled=false,legend="Photos and videos"}:{
 legend?:string;
 value:QueuedPhoto[];
 onChange:(files:QueuedPhoto[])=>void;
 disabled?:boolean;
}){
 const id=useId();
 const [error,setError]=useState("");
 const add=(files:File[])=>onChange(queueFiles(value,files));
 return <fieldset className="min-w-0 space-y-3" disabled={disabled} aria-describedby={id+"-note"}>
  <legend className="font-display text-section-title">{legend}</legend>
  <p id={id+"-note"} className="text-sm leading-6 text-muted-foreground">{value.length?(value.length===1?"1 file":value.length+" files")+" will be added as soon as you save.":"Optional. They start sending as soon as you save."}</p>
  {value.length
   ?<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="Chosen photos and videos">
     {value.map((item,index)=><li key={item.key} className="relative aspect-square overflow-hidden rounded-panel bg-secondary">
      <LocalPreview file={item.file} mime={item.mime}/>
      <button
       type="button"
       disabled={disabled}
       aria-label={"Remove "+(isImage(item.mime)?"photo ":"video ")+(index+1)}
       onClick={()=>onChange(value.filter(file=>file.key!==item.key))}
       className="absolute right-0 top-0 grid size-11 place-items-center rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-55"
      ><span className="grid size-7 place-items-center rounded-full bg-black/60 text-white"><X className="size-4" aria-hidden="true"/></span></button>
     </li>)}
     <li><PhotoChooser tile onFiles={add} onError={setError} disabled={disabled}/></li>
    </ul>
   :<PhotoChooser onFiles={add} onError={setError} disabled={disabled}/>}
  {error?<p role="alert" className="status-message status-error">{error}</p>:null}
 </fieldset>;
}
