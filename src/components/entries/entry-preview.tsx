"use client";
import {useEffect,useRef,useState} from "react";
import type {EntryAccess} from "@/lib/entries/types";
import {MediaCollection} from "./media-collection";
export function EntryPreview(props:{access:EntryAccess;entryTitle:string;entryDate:string}){
 const container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{const node=container.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"200px"});observer.observe(node);return()=>observer.disconnect();},[]);
 return <div ref={container} className="min-h-12">{visible?<MediaCollection {...props} previewOnly/>:null}</div>;
}
