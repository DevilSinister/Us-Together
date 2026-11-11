"use client";
import {useEffect,useRef,useState} from "react";
import type {EntryAccess} from "@/lib/entries/types";
import {MediaCollection,PreviewStripSkeleton} from "./media-collection";

/**
 * A list row's strip of photographs, read only as the row nears the screen.
 * `expect` is how many photographs the server already knows the entry has, so
 * the row can hold their place before they are read instead of jumping when
 * they arrive.
 */
export function EntryPreview({expect,...props}:{access:EntryAccess;entryTitle:string;entryDate:string;expect?:number}){
 const container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{const node=container.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"200px"});observer.observe(node);return()=>observer.disconnect();},[]);
 return <div ref={container} className="min-w-0">{visible?<MediaCollection {...props} expect={expect} previewOnly/>:<PreviewStripSkeleton count={expect}/>}</div>;
}
