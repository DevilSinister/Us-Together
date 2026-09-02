"use client";
import {useId,useState} from "react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {validateUpload} from "@/lib/memories/media";
export type QueuedPhoto={key:string;file:File;caption:string};
export function PhotoPicker({value,onChange,disabled=false,legend="Photos and videos"}:{legend?:string;value:QueuedPhoto[];onChange:(files:QueuedPhoto[])=>void;disabled?:boolean}){
 const id=useId(),[error,setError]=useState("");
 return <fieldset className="space-y-4" disabled={disabled}><legend className="font-display text-2xl">{legend}</legend>
 <p className="text-sm leading-6 text-muted-foreground">Choose several files at once. JPEG/PNG up to 5 MB; MP4/WebM up to 20 MB. Up to 30 files.</p>
 <Label htmlFor={id}>Choose photos or videos</Label><Input id={id} type="file" multiple accept="image/jpeg,image/png,video/mp4,video/webm" className="py-1 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2" onChange={e=>{try{const files=Array.from(e.target.files??[]);if(value.length+files.length>30)throw Error("Choose up to 30 files.");for(const f of files)validateUpload(f.name,f.type,f.size);onChange([...value,...files.map(file=>({key:crypto.randomUUID(),file,caption:""}))]);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not select files.");}e.target.value="";}}/>
 {value.length?<p role="status" className="text-sm font-semibold">{value.length} files selected</p>:null}
 {value.map((item,i)=><div key={item.key} className="rounded-xl border p-4"><p className="break-words text-sm">{item.file.name}</p><div className="mt-3 space-y-2"><Label htmlFor={id+"-"+i}>Caption for file {i+1}</Label><Input id={id+"-"+i} value={item.caption} maxLength={240} onChange={e=>onChange(value.map(x=>x.key===item.key?{...x,caption:e.target.value}:x))}/></div><Button type="button" variant="ghost" className="mt-2" onClick={()=>onChange(value.filter(x=>x.key!==item.key))}>Remove selected file {i+1}</Button></div>)}
 {error?<p role="alert" className="status-message status-error">{error}</p>:null}</fieldset>;
}
