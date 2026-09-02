import "server-only";
import { z } from "zod";
import { planContext } from "@/lib/plans/data";
import { galleryFilter } from "./schema";
import type { Memory, MemoryPage, MemoryDetail } from "./types";
import type { DevState } from "@/lib/auth/dev-session";

export const memoryColumns = "id,title,description,memory_date,location,rating,is_favorite,source_plan_id,source_bucket_item_id,version" as const;
export const mediaColumns = "id,media_type,mime_type,size_bytes,state,caption,width,height,duration_seconds,upload_expires_at" as const;
const galleryColumns = "id,title,description,memory_date,location,rating,is_favorite,source_plan_id,source_bucket_item_id,version,memory_tag_links(memory_tags(name)),memory_media(id,media_type,mime_type,size_bytes,state,caption,width,height,duration_seconds,upload_expires_at)" as const;
function previewMemories(state: DevState): Memory[] {
  return state.memories.map(m => ({ id:m.id,title:m.title,description:m.description,memory_date:m.memoryDate,location:m.location,rating:m.rating,is_favorite:m.favorite,source_plan_id:m.sourcePlanId,source_bucket_item_id:m.sourceBucketId??null,version:m.version??1,tags:m.tags??[],media:[] }));
}
export async function loadMemories(input: unknown): Promise<MemoryPage & { paired: boolean; preview: boolean }> {
  const filter = galleryFilter.parse(input), c = await planContext();
  if (!c.paired) return { memories:[],next:null,paired:false,preview:c.kind==="preview" };
  if (c.kind === "preview") {
    const rows=previewMemories(c.state).filter(m => (!filter.favorite||m.is_favorite)&&(!filter.tag||m.tags.includes(filter.tag))).sort((a,b)=>b.memory_date.localeCompare(a.memory_date)||b.id.localeCompare(a.id)).filter(m=>!filter.cursor||m.memory_date<filter.cursor.date||(m.memory_date===filter.cursor.date&&m.id<filter.cursor.id));
    const page=rows.slice(0,12),last=page.at(-1);
    return {memories:page,next:rows.length>12&&last?{date:last.memory_date,id:last.id}:null,paired:true,preview:true};
  }
  // Tag filtering uses an RLS-bound relational subquery in the RPC; no private filter text enters URLs.
  if (filter.tag) {
    const { data,error }=await c.db.rpc("list_memories_by_tag",{tag_name:filter.tag,favorites:filter.favorite,before_date:filter.cursor?.date??null,before_id:filter.cursor?.id??null} as never);
    if(error)throw new Error("Could not load memories. Try again.");
    const rows=(data??[]) as {id:string}[];
    if(!rows.length)return {memories:[],next:null,paired:true,preview:false};
    const {data:full,error:fullError}=await c.db.from("memories").select(galleryColumns).in("id",rows.map(r=>r.id)).eq("memory_media.state","ready").limit(1,{referencedTable:"memory_media"}).order("memory_date",{ascending:false}).order("id",{ascending:false});
    if(fullError)throw new Error("Could not load memories.");
    return pageFromRows(full??[]);
  }
  let query=c.db.from("memories").select(galleryColumns).eq("couple_id",c.coupleId!).eq("memory_media.state","ready").limit(1,{referencedTable:"memory_media"}).order("memory_date",{ascending:false}).order("id",{ascending:false}).limit(13);
  if(filter.favorite)query=query.eq("is_favorite",true);
  if(filter.cursor)query=query.or("memory_date.lt."+filter.cursor.date+",and(memory_date.eq."+filter.cursor.date+",id.lt."+filter.cursor.id+")");
  const {data,error}=await query;
  if(error)throw new Error("Could not load memories. Try again.");
  return pageFromRows(data??[]);
}
type GalleryRow = Omit<Memory,"tags"|"media"> & { memory_tag_links: {memory_tags:{name:string}|null}[]; memory_media: Memory["media"] };
function pageFromRows(rows: GalleryRow[]) {
  const page=rows.slice(0,12).map(({memory_tag_links,memory_media,...row})=>({...row,tags:memory_tag_links.flatMap(t=>t.memory_tags?[t.memory_tags.name]:[]),media:memory_media}));
  const last=page.at(-1);
  return {memories:page,next:rows.length>12&&last?{date:last.memory_date,id:last.id}:null,paired:true,preview:false};
}
export async function loadMemory(id: string): Promise<MemoryDetail | null> {
  if(!z.uuid().safeParse(id).success)return null;
  const c=await planContext();
  if(!c.paired)return null;
  if(c.kind==="preview"){
    const memory=previewMemories(c.state).find(m=>m.id===id);
    return memory?{memory,preview:true,previewSession:c.state.bucketSessionId,planTitle:c.state.plans.find(p=>p.id===memory.source_plan_id)?.title??null}:null;
  }
  const {data,error}=await c.db.from("memories").select(galleryColumns).eq("id",id).order("created_at",{referencedTable:"memory_media",ascending:true}).limit(30,{referencedTable:"memory_media"}).maybeSingle();
  if(error)throw new Error("Could not open this memory.");
  if(!data)return null;
  const memory=pageFromRows([data]).memories[0];
  let planTitle: string|null=null;
  if(memory.source_plan_id){const {data:p}=await c.db.from("plans").select("title").eq("id",memory.source_plan_id).maybeSingle();planTitle=p?.title??null;}
  return {memory,preview:false,planTitle};
}
