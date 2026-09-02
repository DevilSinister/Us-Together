import { z } from "zod";
import { planContext } from "@/lib/plans/data";
import { inspectAttachment } from "@/lib/plans/schema";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.uuid().safeParse(id).success)return new Response("Not found",{status:404});
 try{
 const c=await planContext();if(c.kind!=="database")return new Response("Not found",{status:404});
 const {data:a,error}=await c.db.from("plan_attachments").select("object_path,mime_type,ready").eq("id",id).eq("ready",true).maybeSingle();
 if(error||!a)return new Response("Not found",{status:404});
 const {data,error:storageError}=await c.db.storage.from("plan-attachments").download(a.object_path);
 if(storageError||!data)return new Response("Unavailable",{status:404});
 const bytes=new Uint8Array(await data.arrayBuffer());inspectAttachment(bytes,a.mime_type);
 return new Response(bytes,{headers:{"Content-Type":a.mime_type,"Content-Disposition":"attachment; filename=plan-attachment."+(a.mime_type==="application/pdf"?"pdf":a.mime_type==="image/png"?"png":"jpg"),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
 }catch{return new Response("Unavailable",{status:404,headers:{"Cache-Control":"no-store"}});}
}
