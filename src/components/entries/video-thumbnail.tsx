"use client";
import {useEffect,useRef,useState} from "react";
import {Film} from "lucide-react";
import {cn} from "@/lib/utils";

/** A silent paused frame, loaded only near the viewport. No private poster cache. */
export function VideoThumbnail({src,eager=false,className}:{src:string;eager?:boolean;className?:string}){
 const container=useRef<HTMLSpanElement>(null);
 const [visible,setVisible]=useState(eager);
 useEffect(()=>{
  const element=container.current;if(!element)return;
  if(typeof IntersectionObserver==="undefined"){const timer=setTimeout(()=>setVisible(true),0);return()=>clearTimeout(timer);}
  const observer=new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{rootMargin:"160px"});
  observer.observe(element);return()=>observer.disconnect();
 },[]);
 return <span ref={container} aria-hidden="true" className={cn("absolute inset-0 block",className)}>
  {visible?<VideoFrame key={src} src={src}/>:<span className="media-skeleton absolute inset-0"/>}
 </span>;
}

function VideoFrame({src}:{src:string}){
 const video=useRef<HTMLVideoElement>(null),target=useRef(0);
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{
  const element=video.current;
  // React Strict Mode remounts effects after cleanup; restore the source then.
  if(element&&element.getAttribute("src")!==src){element.src=src;element.load();}
  return()=>{if(element){element.pause();element.removeAttribute("src");element.load();}};
 },[src]);
 useEffect(()=>{
  if(status==="error"){video.current?.load();return;}
  if(status!=="loading")return;
  const timeout=setTimeout(()=>setStatus("error"),15000);
  return()=>clearTimeout(timeout);
 },[status]);
 const showFrame=(element:HTMLVideoElement)=>{
  if(element.readyState>=2&&!element.seeking&&element.videoWidth>0&&Math.abs(element.currentTime-target.current)<0.1)setStatus("ready");
 };
 return <span className="absolute inset-0 block" data-video-thumbnail={status}>
  <video ref={video} src={status==="error"?undefined:src} muted playsInline preload="metadata" tabIndex={-1}
   disablePictureInPicture disableRemotePlayback
   className={cn("pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none",status==="ready"?"opacity-100":"opacity-0")}
   onLoadedMetadata={event=>{
    const element=event.currentTarget;
    target.current=Number.isFinite(element.duration)&&element.duration>0?Math.min(1,element.duration/2):0;
    try{element.currentTime=target.current;showFrame(element);}catch{setStatus("error");}
   }}
   onLoadedData={event=>showFrame(event.currentTarget)}
   onSeeked={event=>showFrame(event.currentTarget)}
   onError={()=>setStatus("error")}
  />
  {status==="loading"?<span className="media-skeleton absolute inset-0"/>:null}
  {status==="error"?<span className="absolute inset-0 grid content-center justify-items-center gap-1 p-1 text-center text-xs leading-4 text-muted-foreground"><Film className="size-4"/><span>Preview unavailable</span></span>:null}
 </span>;
}
