"use client";
import {LocationField} from "@/components/entries/location-field";
import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { PhotoPicker, type QueuedPhoto } from "@/components/entries/photo-picker";
import { MediaCollection } from "@/components/entries/media-collection";
import { unstable_rethrow } from "next/navigation";
import { createMemoryAction } from "@/app/actions/dream";
import { updateMemoryAction } from "@/app/actions/memories";
import { initialActionState } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Memory } from "@/lib/memories/types";
const fieldClass="min-h-12 w-full rounded-lg border border-border bg-field px-4 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";
export function MemoryForm({sourcePlan,memory,previewSession}:{previewSession?:string;sourcePlan?:{id:string;title:string;memoryDate:string;location:string|null};memory?:Memory}) {
  const [state,action,pending]=useActionState(async (previous:typeof initialActionState,data:FormData)=>{
    try{return await (memory?updateMemoryAction:createMemoryAction)(previous,data);}
    catch(error){unstable_rethrow(error);return {status:"error" as const,message:"Could not confirm the save. Your draft is still here. Check your connection and try again."};}
  },initialActionState);
  const [files,setFiles]=useState<QueuedPhoto[]>([]);
  const formRef=useRef<HTMLFormElement>(null);
  useEffect(()=>{if(state.status==="error")formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[state]);
  const error=(name:string)=>state.fields?.[name]?.[0];
  const described=(name:string)=>error(name)?name+"-error":undefined;
  const message=(name:string)=>error(name)?<p id={name+"-error"} className="field-error">{error(name)}</p>:null;
  if(state.savedId)return <section><h2 className="font-display text-3xl">Your memory is saved.</h2><MediaCollection access={{kind:"memory",id:state.savedId,previewSession}} initial={files}/><Button asChild className="mt-6"><Link href={"/memories/"+state.savedId}>View memory</Link></Button></section>;
  return <form ref={formRef} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);startTransition(()=>action(data));}} className="space-y-6" noValidate>
    <input type="hidden" name="returnCreated" value={files.length?"true":"false"}/>
    <input type="hidden" name="sourcePlanId" value={sourcePlan?.id??""}/>
    {memory?<><input type="hidden" name="id" value={memory.id}/><input type="hidden" name="version" value={memory.version}/></>:null}
    {sourcePlan?<div className="rounded-2xl bg-secondary p-5"><p className="text-sm font-semibold text-primary">From a completed plan</p><p className="mt-2 font-display text-2xl">{sourcePlan.title}</p><p className="mt-2 text-sm text-muted-foreground">The link stays with this memory as you edit its story.</p></div>:null}
    <div className="space-y-2"><Label htmlFor="title">Memory title</Label><Input id="title" name="title" defaultValue={memory?.title??sourcePlan?.title} maxLength={160} required aria-invalid={!!error("title")} aria-describedby={described("title")}/>{message("title")}</div>
    <div className="space-y-2"><Label htmlFor="description">What do you want to remember?</Label><textarea id="description" name="description" rows={6} maxLength={12000} defaultValue={memory?.description??""} className={fieldClass} placeholder="The tiny detail, the feeling, the thing that made you laugh…" aria-invalid={!!error("description")} aria-describedby={described("description")}/>{message("description")}</div>
    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="memoryDate">Date</Label><Input id="memoryDate" name="memoryDate" type="date" defaultValue={memory?.memory_date??sourcePlan?.memoryDate??new Date().toLocaleDateString("en-CA")} required aria-invalid={!!error("memoryDate")} aria-describedby={described("memoryDate")}/>{message("memoryDate")}</div><div className="space-y-2"><LocationField defaultValue={memory?.location??sourcePlan?.location??""} invalid={!!error("location")} describedBy={described("location")}/>{message("location")}</div></div>
    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="rating">How it felt <span className="font-normal text-muted-foreground">optional</span></Label><select id="rating" name="rating" className={fieldClass} defaultValue={memory?.rating??""} aria-invalid={!!error("rating")} aria-describedby={described("rating")}><option value="">No rating</option>{[5,4,3,2,1].map(r=><option key={r} value={r}>{r} / 5</option>)}</select>{message("rating")}</div><label className="flex min-h-12 items-center gap-3 self-end rounded-lg border bg-field px-4 text-sm font-semibold"><input type="checkbox" name="favorite" defaultChecked={memory?.is_favorite} className="size-5 accent-[var(--primary)]"/>Keep as a favorite</label></div>
    {memory?<div className="space-y-2"><Label htmlFor="tags">Tags <span className="font-normal text-muted-foreground">optional</span></Label><Input id="tags" name="tags" defaultValue={memory.tags.join(", ")} aria-invalid={!!error("tags")} aria-describedby={described("tags")??"tags-help"}/><p id="tags-help" className="text-sm text-muted-foreground">Separate with commas. Up to eight tags, such as travel, little moments.</p>{message("tags")}</div>:<PhotoPicker value={files} onChange={setFiles} disabled={pending}/>}
    {state.message?<p className="status-message status-error" role="alert">{state.message}</p>:null}
    <Button type="submit" disabled={pending}>{pending?"Saving…":memory?"Save changes":"Save the memory"}</Button>
  </form>;
}
