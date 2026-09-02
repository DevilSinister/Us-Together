"use client";
import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {previewMedia} from "@/lib/entries/preview-media";
export function PreviewCover({id,session}:{id:string;session:string}){
 const [url,setUrl]=useState<string|null>(null);
 useEffect(()=>{let live=true;let urls:string[]=[];void previewMedia({kind:"memory",id,previewSession:session}).then(files=>{urls=files.flatMap(f=>[f.url,f.previewUrl].filter((x):x is string=>!!x));if(live)setUrl(files.find(f=>f.media_type==="image")?.previewUrl??null);else urls.forEach(URL.revokeObjectURL);}).catch(()=>{});return()=>{live=false;urls.forEach(URL.revokeObjectURL);};},[id,session]);
 return url?<Link href={"/memories/"+id} tabIndex={-1} aria-hidden="true" className="relative mb-5 block aspect-[4/3] overflow-hidden rounded-2xl bg-secondary"><Image src={url} alt="" fill unoptimized sizes="(max-width:640px) 100vw, 33vw" className="object-cover"/></Link>:null;
}
