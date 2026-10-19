"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {memoryMediaAction} from "@/app/actions/memories";
import {createBrowserSupabaseClient} from "@/lib/supabase/browser";
import {addPreviewMedia} from "@/lib/entries/preview-media";
import {uploadQueuedFile,type UploadAllocation} from "@/lib/entries/upload-batch";
import {startTransfer,TransferCancelled,type Transfer} from "@/lib/entries/media-transfer";
import {discard,enqueue,nextQueued,retry as requeue,update,type QueuedPhoto,type UploadItem} from "@/lib/entries/upload-queue";
import type {EntryAccess} from "@/lib/entries/types";
import {queueFiles} from "./photo-picker";

/**
 * Adds chosen files to an entry, one at a time, as soon as they are chosen.
 *
 * Each file is reserved, sent and finished through `uploadQueuedFile`, so a
 * retry after a finished transfer re-finishes the same stored original rather
 * than sending it again. `onSaved` runs after every file so the saved tile
 * appears where the sending one was. Pause holds the batch, including the file
 * in flight, until Continue; a dropped connection only marks the batch as
 * waiting, because the transfer resumes by itself.
 */
export function useEntryUploads({access,initial,onSaved}:{access:EntryAccess;initial:QueuedPhoto[];onSaved:()=>Promise<void>}){
 const [items,setItems]=useState<UploadItem[]>(()=>enqueue([],initial));
 const [paused,setPaused]=useState(false),[waiting,setWaiting]=useState(false);
 const current=useRef(items),held=useRef(false),running=useRef(false),alive=useRef(true);
 const transfer=useRef<{key:string;control:Transfer}|null>(null);
 const allocations=useRef(new Map<string,UploadAllocation>());
 const released=useRef<(()=>void)[]>([]),active=useRef<string|null>(null);
 const saved=useRef(onSaved);
 useEffect(()=>{saved.current=onSaved;},[onSaved]);

 const commit=useCallback((change:(items:UploadItem[])=>UploadItem[])=>{
  current.current=change(current.current);setItems(current.current);
  // A pause holds this batch only; once nothing is left to send, the next files start straight away.
  if(held.current&&!current.current.some(item=>item.status!=="failed")){held.current=false;setPaused(false);for(const resolve of released.current.splice(0))resolve();}
 },[]);
 const whileHeld=useCallback(()=>held.current?new Promise<void>(resolve=>released.current.push(resolve)):Promise.resolve(),[]);
 const stillWanted=useCallback((key:string)=>{if(!current.current.some(item=>item.key===key))throw new TransferCancelled("Removed.");},[]);
 /** Gives back the row reserved for a file that will not be finished. */
 const release=useCallback(async(key:string)=>{
  const allocation=allocations.current.get(key);
  allocations.current.delete(key);
  if(allocation&&!access.previewSession)await memoryMediaAction({operation:"remove",kind:access.kind,memoryId:access.id,id:allocation.id}).catch(()=>null);
 },[access]);

 const send=useCallback(async(item:UploadItem)=>{
  commit(list=>update(list,item.key,{status:"sending",progress:0,error:""}));
  if(access.previewSession){await addPreviewMedia(access,item.file,item.caption);return;}
  const db=createBrowserSupabaseClient();
  await uploadQueuedFile(item,allocations.current,{
   prepare:async()=>{
    const prepared=await memoryMediaAction({operation:"prepare",kind:access.kind,memoryId:access.id,filename:item.file.name,mime:item.mime,size:item.file.size,caption:item.caption});
    if(prepared.error||!prepared.path||!prepared.id)throw Error(prepared.error??"This one couldn't be added. Tap to try again.");
    commit(list=>update(list,item.key,{stored:prepared.id}));
    return {id:prepared.id,path:prepared.path};
   },
   upload:async allocation=>{
    await whileHeld();
    stillWanted(item.key);
    const control=await startTransfer({
     file:item.file,mime:item.mime,bucket:access.kind==="moment"?"moment-media":"memory-media",objectName:allocation.path,auth:db.auth,
     onProgress:progress=>commit(list=>update(list,item.key,{progress})),
     onWaiting:setWaiting,
    });
    transfer.current={key:item.key,control};
    // Pause may have been pressed while the transfer was being set up.
    if(held.current)await control.pause();
    try{await control.done;}finally{transfer.current=null;}
   },
   finalize:async allocation=>{
    stillWanted(item.key);
    commit(list=>update(list,item.key,{status:"processing",progress:100}));
    const result=await memoryMediaAction({operation:"finalize",kind:access.kind,memoryId:access.id,id:allocation.id});
    if(result.error)throw Error(result.error);
   },
  });
 },[access,commit,whileHeld,stillWanted]);

 const pump=useCallback(async()=>{
  if(running.current)return;
  running.current=true;
  try{
   while(alive.current){
    await whileHeld();
    const next=nextQueued(current.current);
    if(!next||!alive.current)break;
    active.current=next.key;
    try{
     await send(next);
     await saved.current();
     commit(list=>discard(list,next.key));
    }catch(problem){
     // A file removed mid-send has already left the queue.
     if(problem instanceof TransferCancelled||!current.current.some(item=>item.key===next.key)){await release(next.key);continue;}
     commit(list=>update(list,next.key,{status:"failed",error:problem instanceof Error?problem.message:"This one couldn't be added. Tap to try again."}));
    }finally{active.current=null;}
   }
  }finally{running.current=false;}
 },[commit,send,whileHeld,release]);

 // Files handed over by a form that has just saved the entry start at once.
 useEffect(()=>{const timer=setTimeout(()=>void pump(),0);return()=>clearTimeout(timer);},[pump]);

 useEffect(()=>{
  alive.current=true;
  const waiters=released.current,active=transfer;
  return()=>{
   alive.current=false;
   void active.current?.control.pause().catch(()=>{});
   for(const resolve of waiters.splice(0))resolve();
  };
 },[]);

 const sending=items.some(item=>item.status!=="failed");
 useEffect(()=>{
  if(!sending)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};
  window.addEventListener("beforeunload",warn);
  return()=>window.removeEventListener("beforeunload",warn);
 },[sending]);

 /** Validates and queues newly chosen files; throws a sentence the person can act on. */
 const add=useCallback((files:File[])=>{
  if(!files.length)return;
  const pending=current.current.map(({key,file,caption,mime})=>({key,file,caption,mime}));
  commit(list=>enqueue(list,queueFiles(pending,files)));
  void pump();
 },[commit,pump]);

 const pause=useCallback(async()=>{
  held.current=true;setPaused(true);
  try{await transfer.current?.control.pause();}catch{/* The next Continue starts from the stored offset. */}
 },[]);

 const resume=useCallback(()=>{
  held.current=false;setPaused(false);
  transfer.current?.control.resume();
  for(const resolve of released.current.splice(0))resolve();
  void pump();
 },[pump]);

 const retry=useCallback((key:string)=>{commit(list=>requeue(list,key));void pump();},[commit,pump]);

 /** Takes a file out, stopping its transfer and discarding any reserved row. */
 const remove=useCallback(async(key:string)=>{
  const item=current.current.find(entry=>entry.key===key);
  if(!item||item.status==="processing")return;
  commit(list=>discard(list,key));
  // The file being sent is stopped here and given back by the send loop.
  if(active.current===key){await transfer.current?.control.cancel();return;}
  await release(key);
 },[commit,release]);

 return {items,paused,waiting,add,pause,resume,retry,remove};
}
