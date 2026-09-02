"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/auth/types";
import { writeDeveloperState } from "@/lib/auth/dev-session";
import { planContext } from "@/lib/plans/data";
import { loadMemories } from "@/lib/memories/data";
import { editMemorySchema, mediaRequest } from "@/lib/memories/schema";

function refresh(id: string) { revalidatePath("/calendar"); revalidatePath("/milestones/"+id); revalidatePath("/memories"); revalidatePath("/memories/"+id); revalidatePath("/home"); }
export async function filterMemories(input: unknown) {
  try { return { page:await loadMemories(input) }; } catch { return { error:"Could not load memories. Check your connection and try again." }; }
}
export async function updateMemoryAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed=editMemorySchema.safeParse(Object.fromEntries(form));
  if(!parsed.success)return {status:"error",message:"Check the highlighted details.",fields:parsed.error.flatten().fieldErrors};
  const v=parsed.data;
  try {
    const c=await planContext();
    if(!c.paired)throw new Error("Open your shared space first.");
    if(c.kind==="preview"){
      const old=c.state.memories.find(m=>m.id===v.id);
      if(!old)throw new Error("This memory is unavailable.");
      if((old.version??1)!==v.version)throw new Error("This memory changed. Refresh before editing again.");
      await writeDeveloperState({...c.state,memories:c.state.memories.map(m=>m.id===v.id?{...m,title:v.title,description:v.description??"",memoryDate:v.memoryDate,location:v.location??"",rating:v.rating===""?null:v.rating,favorite:v.favorite,tags:v.tags,version:v.version+1}:m)});
    } else {
      const {data,error}=await c.db.rpc("update_memory_details",{input:{id:v.id,version:v.version,title:v.title,description:v.description,memoryDate:v.memoryDate,location:v.location,rating:v.rating===""?null:v.rating,favorite:v.favorite,tags:v.tags}});
      if(error)throw new Error("Could not save the memory. Try again.");
      if(!(data as {ok?:boolean})?.ok)throw new Error("This memory changed or is unavailable. Refresh before editing again.");
    }
  } catch(error) { return {status:"error",message:error instanceof Error?error.message:"Could not save the memory."}; }
  refresh(v.id); redirect("/memories/"+v.id);
}
export async function deleteMemory(input: unknown) {
  try{
    const v=z.object({id:z.uuid(),version:z.number().int().positive(),confirmation:z.literal("DELETE")}).parse(input),c=await planContext();
    if(!c.paired)throw new Error("Memory unavailable.");
    if(c.kind==="preview"){
      const m=c.state.memories.find(m=>m.id===v.id);
      if(!m||(m.version??1)!==v.version)throw new Error("This memory changed. Refresh and try again.");
      await writeDeveloperState({...c.state,memories:c.state.memories.filter(m=>m.id!==v.id),entryReminders:c.state.entryReminders?.filter(r=>r.kind!=="memory"||r.entryId!==v.id)});
    }else{
      const {data,error}=await c.db.from("memories").delete().eq("id",v.id).eq("version",v.version).select("id").maybeSingle();
      if(error?.code==="23503")throw new Error("Remove all photos, videos, and unfinished uploads first.");
      if(error||!data)throw new Error("This memory changed or could not be removed. Refresh and try again.");
    }
    refresh(v.id);return {ok:true};
  }catch(error){return {ok:false,error:error instanceof Error?error.message:"Could not remove the memory."};}
}
export async function memoryMediaAction(input: unknown): Promise<{ok?:boolean;id?:string;path?:string;expiresAt?:string;error?:string}> {
  const parsed=mediaRequest.safeParse(input);
  if(!parsed.success)return {error:parsed.error.issues[0].message};
  try{
    const c=await planContext();
    if(c.kind!=="database"||!c.paired)return {error:"Sign in with your connected account to add photos and videos."};
    const {data:m}=await c.db.from(parsed.data.kind==="moment"?"milestones":"memories").select("id").eq("id",parsed.data.memoryId).maybeSingle();
    if(!m)return {error:"Memory unavailable."};
    const {data,error}=await c.db.functions.invoke("memory-media",{body:parsed.data});
    if(error){
      const context=(error as {context?:Response}).context;
      if(context){try{const body=await context.json();if(typeof body.error==="string")return {error:body.error};}catch{}}
      return {error:"Media processing is unavailable. Check your connection and try again."};
    }
    refresh(parsed.data.memoryId);
    return data;
  }catch{return {error:"Could not reach media processing. Try again."};}
}
