"use server";
import {z} from "zod";
import {planContext} from "@/lib/plans/data";
import {galleryFilter,type GalleryPage} from "@/lib/entries/gallery";
import type {EntryComment} from "@/lib/entries/types";
export async function loadGallery(input:unknown):Promise<GalleryPage>{
 const empty:GalleryPage={items:[],next:null,paired:false};
 try{const f=galleryFilter.parse(input),c=await planContext();if(!c.paired)return empty;
 if(c.kind==="preview")return {...empty,paired:true,previewEntries:[
 ...c.state.memories.map(m=>({access:{kind:"memory" as const,id:m.id,previewSession:c.state.bucketSessionId},title:m.title,date:m.memoryDate})),
 ...c.state.milestones.map(m=>({access:{kind:"moment" as const,id:m.id,previewSession:c.state.bucketSessionId},title:m.title,date:m.milestoneDate}))
 ].filter(e=>(!f.entry||e.access.id===f.entry)&&(f.kind==="all"||e.access.kind===f.kind))};
 let q=c.db.from("shared_gallery").select("id,kind,sort_key,entry_id,entry_title,entry_date,caption,media_type,mime_type,state,size_bytes,duration_seconds").eq("couple_id",c.coupleId!).order("entry_date",{ascending:false}).order("sort_key").limit(49);
 if(f.entry)q=q.eq("entry_id",f.entry);
 if(f.kind!=="all")q=q.eq("kind",f.kind);if(f.media!=="all")q=q.eq("media_type",f.media);if(f.date)q=q.eq("entry_date",f.date);
 if(f.cursor)q=q.or("entry_date.lt."+f.cursor.date+",and(entry_date.eq."+f.cursor.date+",sort_key.gt."+f.cursor.key+")");
 const {data,error}=await q;if(error)throw error;
 const rows=data.slice(0,48),last=rows.at(-1);
 return {paired:true,items:rows.map(r=>({id:r.id!,caption:r.caption??"",media_type:r.media_type!,mime_type:r.mime_type!,state:r.state!,size_bytes:r.size_bytes!,duration_seconds:r.duration_seconds,access:{kind:r.kind==="memory"?"memory":"moment",id:r.entry_id!},entryTitle:r.entry_title!,entryDate:r.entry_date!,sortKey:r.sort_key!})),next:data.length>48&&last?{date:last.entry_date!,key:last.sort_key!}:null};
 }catch{return {...empty,error:"Could not open the gallery. Check your connection and try again."};}
}
const target=z.object({kind:z.enum(["memory","moment"]),id:z.uuid(),mediaId:z.uuid()});
async function mediaContext(input:unknown){const a=target.parse(input),c=await planContext();if(!c.paired||c.kind==="preview")throw Error("Photo unavailable.");const {data,error}=await (a.kind==="memory"?c.db.from("memory_media").select("id").eq("memory_id",a.id):c.db.from("milestone_media").select("id").eq("milestone_id",a.id)).eq("id",a.mediaId).eq("state","ready").maybeSingle();if(error||!data)throw Error("Photo unavailable.");return {a,c};}
export async function loadMediaComments(input:unknown):Promise<{comments?:EntryComment[];error?:string}>{
 try{const {a,c}=await mediaContext(input);const {data,error}=await c.db.from("media_comments").select("id,body,created_at,created_by").eq(a.kind==="memory"?"memory_media_id":"milestone_media_id",a.mediaId).order("created_at").order("id").limit(500);if(error)throw error;return {comments:data.map(r=>({id:r.id,body:r.body,created_at:r.created_at,mine:r.created_by===c.userId}))};}catch{return {error:"Could not load comments. Try again."};}
}
export async function mediaCommentAction(input:unknown){
 try{const v=target.extend({operation:z.enum(["add","remove"]),body:z.string().trim().min(1).max(2000).optional(),commentId:z.uuid().optional()}).parse(input),{a,c}=await mediaContext(v);
 if(v.operation==="add"){if(!v.body)throw Error("Write a comment first.");const {error}=await c.db.from("media_comments").insert({memory_media_id:a.kind==="memory"?a.mediaId:null,milestone_media_id:a.kind==="moment"?a.mediaId:null,created_by:c.userId,body:v.body});if(error)throw Error("Could not post the comment.");}
 else {if(!v.commentId)throw Error("Comment unavailable.");const {data,error}=await c.db.from("media_comments").delete().eq("id",v.commentId).eq("created_by",c.userId).eq(a.kind==="memory"?"memory_media_id":"milestone_media_id",a.mediaId).select("id").maybeSingle();if(error||!data)throw Error("Could not delete the comment.");}
 return {ok:true};
 }catch(e){return {error:e instanceof Error?e.message:"Could not update comments."};}
}
