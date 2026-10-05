"use client";
import {useEffect,useRef,useState} from "react";
import type {Upload} from "tus-js-client";
import {memoryMediaAction} from "@/app/actions/memories";
import {createBrowserSupabaseClient} from "@/lib/supabase/browser";
import {requireSupabaseConfig} from "@/lib/supabase/config";
import {addPreviewMedia} from "@/lib/entries/preview-media";
import {runUploadBatch,uploadQueuedFile,type UploadAllocation} from "@/lib/entries/upload-batch";
import {resumableAuthOptions,uploadFailure} from "@/lib/entries/resumable-upload";
import type {EntryAccess} from "@/lib/entries/types";
import {PhotoQueue,type QueuedPhoto} from "./photo-picker";
import {Button} from "@/components/ui/button";

/**
 * The upload machinery for an entry that already exists.
 *
 * The queue is owned by the surrounding media collection so the chooser can sit
 * inside the photo grid; this component shows what is waiting and sends it.
 */
export function EntryUploader({access,files,onFiles,autoStart=false,onBusy,onChange}:{
 access:EntryAccess;
 files:QueuedPhoto[];
 onFiles:(files:QueuedPhoto[])=>void;
 autoStart?:boolean;
 onBusy?:(busy:boolean)=>void;
 onChange:()=>Promise<void>;
}){
 const form=useRef<HTMLFormElement>(null),upload=useRef<Upload|null>(null),rejectUpload=useRef<((error:Error)=>void)|null>(null),started=useRef(false),cancelled=useRef(false);
 const allocations=useRef(new Map<string,UploadAllocation>()),running=useRef(false);
 const connectionPaused=useRef(false);
 const [status,setStatus]=useState("idle"),[progress,setProgress]=useState(0),[error,setError]=useState(""),[current,setCurrent]=useState(0);
 const busy=status!=="idle";
 const busyCallback=useRef(onBusy);
 useEffect(()=>{busyCallback.current=onBusy;},[onBusy]);
 useEffect(()=>{busyCallback.current?.(busy);},[busy]);
 useEffect(()=>{const timer=setTimeout(()=>{if(autoStart&&files.length&&!started.current){started.current=true;form.current?.requestSubmit();}},0);return()=>clearTimeout(timer);},[autoStart,files.length]);
 useEffect(()=>()=>{cancelled.current=true;void upload.current?.abort().catch(()=>{});rejectUpload.current?.(Error("Upload stopped."));},[]);
 useEffect(()=>{const resume=()=>{if(connectionPaused.current&&!cancelled.current&&navigator.onLine&&document.visibilityState==="visible"){connectionPaused.current=false;setError("");setStatus("uploading");upload.current?.start();}};window.addEventListener("online",resume);document.addEventListener("visibilitychange",resume);return()=>{window.removeEventListener("online",resume);document.removeEventListener("visibilitychange",resume);};},[]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!files.length||running.current)return;running.current=true;setError("");setStatus("uploading");cancelled.current=false;
 try{const result=await runUploadBatch(files,async(item,index)=>{setCurrent(index+1);setProgress(0);setStatus("uploading");
 if(access.previewSession){await addPreviewMedia(access,item.file,item.caption);setProgress(100);return;}
 const db=createBrowserSupabaseClient();
 await uploadQueuedFile(item,allocations.current,{prepare:async()=>{
 const prepared=await memoryMediaAction({operation:"prepare",kind:access.kind,memoryId:access.id,filename:item.file.name,mime:item.mime,size:item.file.size,caption:item.caption});
 if(prepared.error||!prepared.path||!prepared.id)throw Error(prepared.error??"Could not start upload.");
 return {id:prepared.id,path:prepared.path};
 },upload:async(prepared)=>{
 if(cancelled.current)throw Error("Upload stopped.");
 const {Upload}=await import("tus-js-client"),host=new URL(requireSupabaseConfig().url);host.hostname=host.hostname.replace(".supabase.co",".storage.supabase.co");
 setStatus("uploading");
 connectionPaused.current=false;
 try{await new Promise<void>((resolve,reject)=>{rejectUpload.current=reject;upload.current=new Upload(item.file,{...resumableAuthOptions(db.auth),endpoint:host.origin+"/storage/v1/upload/resumable",headers:{apikey:requireSupabaseConfig().publishableKey},chunkSize:6*1024*1024,uploadDataDuringCreation:true,storeFingerprintForResuming:false,removeFingerprintOnSuccess:true,metadata:{bucketName:access.kind==="moment"?"moment-media":"memory-media",objectName:prepared.path!,contentType:item.mime,cacheControl:"60"},onProgress:(n,total)=>setProgress(Math.round(n/total*100)),onSuccess:()=>resolve(),onError:(error)=>{const failure=uploadFailure(error);if(!failure.recoverable){reject(Error(failure.message));return;}connectionPaused.current=true;setStatus("paused");setError(failure.message);}});upload.current.start();});}
 finally{connectionPaused.current=false;upload.current=null;rejectUpload.current=null;}
 },finalize:async(prepared)=>{
 if(cancelled.current)throw Error("Upload stopped.");
 setStatus("processing");const result=await memoryMediaAction({operation:"finalize",kind:access.kind,memoryId:access.id,id:prepared.id});if(result.error)throw Error(result.error);
 }});
 },()=>cancelled.current);
 onFiles(result.remaining);setError(result.cancelled?"Upload stopped. Remaining files are still selected.":result.failed?result.failed+" file"+(result.failed===1?"":"s")+" could not finish. "+result.firstError+(result.failed<files.length?" Other files were saved.":" Your saved story is safe.")+" Retry the remaining files or use Finish processing below.":"");
 }catch(e){setError(e instanceof Error?e.message:"Could not finish upload.");}
 finally{upload.current=null;rejectUpload.current=null;running.current=false;setStatus("idle");await onChange();}
 }
 if(!files.length&&!busy&&!error)return null;
 return <form method="post" ref={form} onSubmit={submit} className="mt-5 space-y-4">
 <PhotoQueue value={files} onChange={onFiles} disabled={busy}/>
 {access.previewSession&&files.length?<p className="text-sm leading-6 text-muted-foreground">Preview photos stay in this browser for up to 24 hours. They are not uploaded to your shared account.</p>:null}
 {busy?<div role="status"><p className="text-sm font-semibold">{status==="processing"?"Preparing the file":status==="paused"?"Upload paused":"Uploading"} · {current} of {files.length}</p><progress className="mt-2 h-1.5 w-full accent-[var(--primary)]" value={progress} max={100} aria-label="Upload progress"/></div>:null}
 {error?<p role="alert" className="status-message status-error">{error}</p>:null}
 <div className="flex flex-wrap gap-3">{status==="idle"?<Button disabled={!files.length}>{files.length===1?"Upload 1 file":"Upload "+files.length+" files"}</Button>:status==="uploading"&&!access.previewSession?<Button type="button" variant="outline" onClick={async()=>{try{if(upload.current){connectionPaused.current=false;await upload.current.abort();setStatus("paused");}}catch{setError("Could not pause. Try again.");}}}>Pause upload</Button>:status==="paused"?<><Button type="button" onClick={()=>{connectionPaused.current=false;setError("");setStatus("uploading");upload.current?.start();}}>Resume upload</Button><Button type="button" variant="outline" onClick={async()=>{cancelled.current=true;connectionPaused.current=false;try{await upload.current?.abort(true);}catch{setError("Could not confirm cancellation. Remove the unfinished file below.");}finally{rejectUpload.current?.(Error("Upload stopped."));}}}>Stop upload</Button></>:null}</div></form>;
}
