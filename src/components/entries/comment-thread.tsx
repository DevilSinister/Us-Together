"use client";
import {useCallback,useEffect,useId,useState} from "react";
import {entryComments,commentAction} from "@/app/actions/entries";
import {loadMediaComments,mediaCommentAction} from "@/app/actions/gallery";
import {previewComments,addPreviewComment,deletePreviewComment} from "@/lib/entries/preview-media";
import type {EntryAccess,EntryComment} from "@/lib/entries/types";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
export function CommentThread({access,mediaId}:{access:EntryAccess;mediaId?:string}){
 const [comments,setComments]=useState<EntryComment[]>([]),[body,setBody]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false),[loading,setLoading]=useState(true);
 const field=useId(),{kind,id,previewSession}=access;
 const reload=useCallback(async()=>{try{const a={kind,id,previewSession};if(previewSession)setComments(await previewComments(a,mediaId));else{const r=await (mediaId?loadMediaComments({...a,mediaId}):entryComments(a));if(r.error)throw Error(r.error);setComments(r.comments??[]);}setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load comments.");}finally{setLoading(false);}},[kind,id,previewSession,mediaId]);
 useEffect(()=>{const t=setTimeout(()=>void reload(),0);return()=>clearTimeout(t);},[reload]);
 async function mutate(operation:"add"|"remove",commentId?:string){setPending(true);try{
 if(previewSession){if(operation==="add")await addPreviewComment(access,body,mediaId);else await deletePreviewComment(access,commentId!,mediaId);}
 else {const r=await (mediaId?mediaCommentAction({...access,mediaId,operation,commentId,body:operation==="add"?body:undefined}):commentAction({...access,operation,commentId,body:operation==="add"?body:undefined}));if(r.error)throw Error(r.error);}
 if(operation==="add")setBody("");await reload();
 }catch(e){setError(e instanceof Error?e.message:"Could not save comment.");}finally{setPending(false);}}
 return <section aria-label={mediaId?"Photo comments":"Memory comments"} className="mt-7 border-t pt-5">
 <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl">{mediaId?"Comments":"What you remember"}</h2><Button variant="ghost" disabled={pending} onClick={()=>void reload()}>Refresh comments</Button></div>
 {error?<p role="alert" className="status-message status-error mt-3">{error}</p>:null}
 {loading?<p role="status" className="mt-3 text-sm text-muted-foreground">Loading comments…</p>:null}
 <div className="divide-y">{comments.map(c=><article key={c.id} className="py-4"><p className="text-sm font-semibold text-primary">{c.mine?"You":"Your partner"}</p><p className="mt-2 whitespace-pre-wrap break-words leading-7">{c.body}</p>{c.mine?<Button variant="ghost" disabled={pending} onClick={()=>void mutate("remove",c.id)}>Delete comment</Button>:null}</article>)}</div>
 {!loading&&!comments.length?<p className="mt-3 text-sm text-muted-foreground">Leave a little detail for each other.</p>:null}
 <form onSubmit={e=>{e.preventDefault();void mutate("add");}} className="mt-5 space-y-3"><Label htmlFor={field}>{mediaId?"Comment on this file":"Add a comment"}</Label><textarea id={field} disabled={pending} value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} rows={3} className="w-full rounded-lg border bg-field p-3 focus-visible:outline-ring"/><Button disabled={pending||!body.trim()}>Post comment</Button></form></section>;
}
