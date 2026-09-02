import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function GET(request: Request, { params }: {params: Promise<{id:string}>}) {
  const {id}=await params,kind=new URL(request.url).searchParams.get("kind")??"memory",variant=new URL(request.url).searchParams.get("variant")??"original";
  const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
  if(!["memory","moment"].includes(kind)||!z.uuid().safeParse(id).success||!["original","preview","download"].includes(variant))return new Response("Not found",{status:404,headers});
  const db=await createServerSupabaseClient(),{data:{user}}=await db.auth.getUser();
  if(!user)return new Response("Not found",{status:404,headers});
  const {data:allowed,error:limitError}=await db.rpc("consume_memory_media_budget",{kind:"view"});
  if(limitError||!allowed)return new Response("Try again shortly",{status:429,headers});
  const {data:m}=await db.from(kind==="moment"?"milestone_media":"memory_media").select("storage_path,derivative_path,state,mime_type").eq("id",id).eq("state","ready").maybeSingle();
  if(!m)return new Response("Not found",{status:404,headers});
  const path=variant==="preview"?m.derivative_path:m.storage_path;
  if(!path)return new Response("Not found",{status:404,headers});
  const {data,error}=await db.storage.from(kind==="moment"?"moment-media":"memory-media").createSignedUrl(path,60,variant==="download"?{download:"memory."+({"image/jpeg":"jpg","image/png":"png","video/mp4":"mp4","video/webm":"webm"}[m.mime_type]??"bin")}:{});
  if(error||!data)return new Response("Unavailable",{status:404,headers});
  return new Response(null,{status:307,headers:{...headers,Location:data.signedUrl}});
}
