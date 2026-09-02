"use client";
import {useEffect,useRef,useState} from "react";
import type {Upload} from "tus-js-client";
import {memoryMediaAction} from "@/app/actions/memories";
import {createBrowserSupabaseClient} from "@/lib/supabase/browser";
import {requireSupabaseConfig} from "@/lib/supabase/config";
import {addPreviewMedia} from "@/lib/entries/preview-media";
import type {EntryAccess} from "@/lib/entries/types";
import {PhotoPicker,type QueuedPhoto} from "./photo-picker";
import {Button} from "@/components/ui/button";
export function EntryUploader({access,initial=[],onChange}:{access:EntryAccess;initial?:QueuedPhoto[];onChange:()=>Promise<void>}){
 const form=useRef<HTMLFormElement>(null),upload=useRef<Upload|null>(null),rejectUpload=useRef<((error:Error)=>void)|null>(null),started=useRef(false),cancelled=useRef(false);
 const [files,setFiles]=useState(initial),[status,setStatus]=useState("idle"),[progress,setProgress]=useState(0),[error,setError]=useState(""),[current,setCurrent]=useState(0);
 useEffect(()=>{const timer=setTimeout(()=>{if(initial.length&&!started.current){started.current=true;form.current?.requestSubmit();}},0);return()=>clearTimeout(timer);},[initial.length]);
 useEffect(()=>()=>{cancelled.current=true;void upload.current?.abort().catch(()=>{});},[]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!files.length)return;setError("");setStatus("uploading");cancelled.current=false;let index=0;
 try{for(;index<files.length;index++){if(cancelled.current)break;const item=files[index];setCurrent(index+1);setProgress(0);
 if(access.previewSession){await addPreviewMedia(access,item.file,item.caption);setProgress(100);continue;}
 const db=createBrowserSupabaseClient(),{data:{session}}=await db.auth.getSession();if(!session)throw Error("Your session expired. Sign in again.");
 const prepared=await memoryMediaAction({operation:"prepare",kind:access.kind,memoryId:access.id,filename:item.file.name,mime:item.file.type,size:item.file.size,caption:item.caption});
 if(prepared.error||!prepared.path||!prepared.id)throw Error(prepared.error??"Could not start upload.");
 const {Upload}=await import("tus-js-client"),host=new URL(requireSupabaseConfig().url);host.hostname=host.hostname.replace(".supabase.co",".storage.supabase.co");
 setStatus("uploading");
 await new Promise<void>((resolve,reject)=>{rejectUpload.current=reject;upload.current=new Upload(item.file,{endpoint:host.origin+"/storage/v1/upload/resumable",headers:{authorization:"Bearer "+session.access_token,apikey:requireSupabaseConfig().publishableKey},chunkSize:6*1024*1024,uploadDataDuringCreation:true,retryDelays:[0,1000,3000,5000],storeFingerprintForResuming:false,removeFingerprintOnSuccess:true,metadata:{bucketName:access.kind==="moment"?"moment-media":"memory-media",objectName:prepared.path!,contentType:item.file.type,cacheControl:"60"},onProgress:(n,total)=>setProgress(Math.round(n/total*100)),onSuccess:()=>resolve(),onError:()=>{setStatus("paused");setError("Upload paused after a connection problem. Resume or stop this batch.");}});upload.current.start();});
 setStatus("processing");const result=await memoryMediaAction({operation:"finalize",kind:access.kind,memoryId:access.id,id:prepared.id});if(result.error)throw Error(result.error);
 }
 setFiles([]);setError(cancelled.current?"Upload stopped. Remove any unfinished files below.":"");
 }catch(e){setError((e instanceof Error?e.message:"Could not finish upload.")+" Your saved story is safe. Check unfinished files below before retrying.");setFiles(files.slice(index));}
 finally{upload.current=null;rejectUpload.current=null;setStatus("idle");await onChange();}
 }
 return <form ref={form} onSubmit={submit} className="mt-6 space-y-5"><PhotoPicker legend="Add photos or videos" value={files} onChange={setFiles} disabled={status!=="idle"}/>
 {access.previewSession?<p className="text-sm leading-6 text-muted-foreground">Preview photos stay in this browser for up to 24 hours. They are not uploaded to your shared account.</p>:null}
 {status!=="idle"?<div role="status"><p>{status==="processing"?"Preparing the file":status==="paused"?"Upload paused":"Uploading"} · {current} of {files.length}</p><progress className="mt-3 h-2 w-full accent-[var(--primary)]" value={progress} max={100} aria-label="Upload progress"/></div>:null}
 {error?<p role="alert" className="status-message status-error">{error}</p>:null}
 <div className="flex flex-wrap gap-3">{status==="idle"?<Button disabled={!files.length}>Upload selected files</Button>:status==="uploading"&&!access.previewSession?<Button type="button" variant="outline" onClick={async()=>{try{if(upload.current){await upload.current.abort();setStatus("paused");}}catch{setError("Could not pause. Try again.");}}}>Pause upload</Button>:status==="paused"?<><Button type="button" onClick={()=>{setError("");setStatus("uploading");upload.current?.start();}}>Resume upload</Button><Button type="button" variant="outline" onClick={async()=>{cancelled.current=true;try{await upload.current?.abort(true);}catch{setError("Could not confirm cancellation. Remove the unfinished file below.");}finally{rejectUpload.current?.(Error("Upload stopped."));}}}>Stop upload</Button></>:null}</div></form>;
}
