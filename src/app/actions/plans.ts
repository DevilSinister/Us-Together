"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { planContext, loadPlan } from "@/lib/plans/data";
import { calendarFilter } from "@/lib/plans/calendar";
import { loadPlans } from "@/lib/plans/data";
import { editPlanSchema,planInterval,planMutationSchema,inspectAttachment,attachmentLimit } from "@/lib/plans/schema";
import { moneyToMinorUnits } from "@/lib/dream/schema";
import { writeDeveloperState } from "@/lib/auth/dev-session";
import type { ActionState } from "@/lib/auth/types";
const resultSchema=z.object({ok:z.boolean(),code:z.string().optional()});
function checkResult(value:unknown) {
 const r=resultSchema.parse(value);
 if(!r.ok)throw new Error(r.code==="CONFLICT"?"This plan changed. Refresh the page before trying again.":r.code==="ATTACHMENTS_EXIST"?"Remove the attachments before deleting this plan.":"That plan is no longer available.");
}
function refresh(id:string){revalidatePath("/plans");revalidatePath("/plans/"+id);revalidatePath("/home");}
export async function filterPlans(input:unknown) {
 try{return {page:await loadPlans(calendarFilter.parse(input))};}catch{return {error:"We couldn't load these plans. Try again."};}
}
export async function updatePlanAction(_previous:ActionState,form:FormData):Promise<ActionState> {
 const parsed=editPlanSchema.safeParse(Object.fromEntries(form));
 if(!parsed.success)return {status:"error",message:"Check the plan details.",fields:parsed.error.flatten().fieldErrors};
 const d=parsed.data;
 try{
   const {startsAt,endsAt}=planInterval(d),c=await planContext();
   if(!c.paired)throw new Error("Create your shared space first.");
   if(c.kind==="preview"){
     const p=c.state.plans.find(p=>p.id===d.planId);
     if(!p||(p.version??1)!==d.version)throw new Error("This plan changed. Refresh the page before trying again.");
     await writeDeveloperState({...c.state,plans:c.state.plans.map(p=>p.id===d.planId?{...p,title:d.title,description:d.description??"",type:d.type,startsAt,endsAt,timezone:d.timezone,location:d.location??"",latitude:d.latitude,longitude:d.longitude,mapUrl:d.mapUrl,budgetMinor:moneyToMinorUnits(d.budget),currency:d.currency||null,version:d.version+1}:p),planReminders:(c.state.planReminders??[]).map(r=>r.plan_id===d.planId&&r.state==="pending"?{...r,due_at:new Date(Date.parse(startsAt)-r.offset_minutes*60000).toISOString(),state:Date.parse(startsAt)-r.offset_minutes*60000>Date.now()?"pending":"cancelled"}:r)});
   }else{
     const {data,error}=await c.db.rpc("update_plan_details",{input:{planId:d.planId,version:d.version,title:d.title,description:d.description,type:d.type,starts_at:startsAt,ends_at:endsAt,timezone:d.timezone,location:d.location,latitude:d.latitude,longitude:d.longitude,external_map_url:d.mapUrl,budget_minor:moneyToMinorUnits(d.budget),currency:d.currency||null}});
     if(error)throw new Error("We couldn't save the changes. Check the details and try again.");checkResult(data);
   }
   refresh(d.planId);
 }catch(e){return {status:"error",message:e instanceof Error?e.message:"We couldn't save changes."};}
 redirect("/plans/"+d.planId);
}
export async function mutatePlan(input:unknown) {
 const parsed=planMutationSchema.safeParse(input);
 if(!parsed.success)return {ok:false,message:"Check the details and try again."};
 const d=parsed.data;
 try{
 const c=await planContext();
 if(!c.paired)throw new Error("Create your shared space first.");
 if(c.kind==="preview"){
   const p=c.state.plans.find(p=>p.id===d.planId);
   if(!p)throw new Error("That plan is no longer available.");
   if((p.version??1)!==d.version)throw new Error("This plan changed. Refresh the page before trying again.");
   const state={...c.state,planChecklist:[...(c.state.planChecklist??[])],planReminders:[...(c.state.planReminders??[])]};
   if(d.operation==="status"){p.status=d.status;if(d.status!=="planned")state.planReminders=state.planReminders.map(r=>r.plan_id===p.id&&r.state==="pending"?{...r,state:"cancelled"}:r);}
   if(d.operation==="delete"){state.plans=state.plans.filter(x=>x.id!==p.id);state.planChecklist=state.planChecklist.filter(x=>x.plan_id!==p.id);state.planReminders=state.planReminders.filter(x=>x.plan_id!==p.id);state.memories=state.memories.map(m=>m.sourcePlanId===p.id?{...m,sourcePlanId:null}:m);}
   if(d.operation==="checklist"){
     const own=state.planChecklist.filter(x=>x.plan_id===p.id);
     if(d.kind==="add"){if(!d.label||own.length>=50)throw new Error("Add a label; a checklist holds up to 50 steps.");state.planChecklist.push({id:crypto.randomUUID(),plan_id:p.id,label:d.label,is_completed:false,position:Math.max(-1,...own.map(t=>t.position))+1});}
     else if(d.kind==="delete")state.planChecklist=state.planChecklist.filter(x=>!(x.id===d.id&&x.plan_id===p.id));
     else if(d.kind==="update")state.planChecklist=state.planChecklist.map(x=>x.id===d.id&&x.plan_id===p.id?{...x,label:d.label??x.label,is_completed:d.completed??x.is_completed}:x);
     else {if(!d.ids||d.ids.length!==own.length||new Set(d.ids).size!==own.length||d.ids.some(id=>!own.some(x=>x.id===id)))throw new Error("The checklist changed. Refresh and try again.");state.planChecklist=state.planChecklist.map(x=>x.plan_id===p.id?{...x,position:d.ids!.indexOf(x.id)}:x);}
   }
   if(d.operation==="reminder"){
    if(d.kind==="add"){const mins=d.minutes;if(mins===undefined||p.status!=="planned")throw new Error("Only planned experiences can have reminders.");const due=new Date(Date.parse(p.startsAt)-mins*60000);if(due.getTime()<=Date.now())throw new Error("Choose a reminder that is still in the future.");if(state.planReminders.filter(r=>r.plan_id===p.id).length>=5||state.planReminders.some(r=>r.plan_id===p.id&&r.offset_minutes===mins))throw new Error("Choose a different reminder; a plan holds up to five.");state.planReminders.push({id:crypto.randomUUID(),plan_id:p.id,due_at:due.toISOString(),state:"pending",offset_minutes:mins});}
    else state.planReminders=state.planReminders.filter(r=>!(r.plan_id===p.id&&r.id===d.id));
   }
   p.version=(p.version??1)+1;await writeDeveloperState(state);
 }else{
   const {data,error}=await c.db.rpc("mutate_plan",{input:d});
   if(error)throw new Error("We couldn't make that change. Check the details and try again.");checkResult(data);
 }
 refresh(d.planId);return {ok:true,message:"Saved."};
 }catch(e){return {ok:false,message:e instanceof Error?e.message:"We couldn't save this change."};}
}
export async function uploadPlanAttachment(_previous:ActionState,form:FormData):Promise<ActionState>{
 const id=z.uuid().safeParse(form.get("planId")),file=form.get("file");
 if(!id.success||!(file instanceof File)||file.size>attachmentLimit)return {status:"error",message:"Choose a PDF, PNG, or JPEG up to 2 MB."};
 try{
 const c=await planContext();if(c.kind==="preview")throw new Error("Attachments require your connected account.");
 const detail=await loadPlan(id.data);if(!detail)throw new Error("That plan is no longer available.");if(detail.attachments.length>=20)throw new Error("Remove an attachment before adding another (20 maximum).");
 const bytes=new Uint8Array(await file.arrayBuffer());inspectAttachment(bytes,file.type);
 const aid=crypto.randomUUID(),path=id.data+"/"+aid,filename=file.name.replace(/[\x00-\x1f\x7f/\\]/g,"_").slice(0,160)||"attachment";
 const {error:metadataError}=await c.db.from("plan_attachments").insert({id:aid,plan_id:id.data,object_path:path,filename,mime_type:file.type,size_bytes:file.size});
 if(metadataError)throw new Error("We couldn't prepare the upload. Try again.");
 const {error:uploadError}=await c.db.storage.from("plan-attachments").upload(path,bytes,{contentType:file.type,upsert:false});
 if(uploadError){refresh(id.data);throw new Error("Upload interrupted. Remove the unfinished attachment, then try again.");}
 const {error:finalizeError}=await c.db.from("plan_attachments").update({ready:true}).eq("id",aid).select("id").single();
 if(finalizeError){refresh(id.data);throw new Error("Upload could not be finalized. Remove the unfinished attachment and try again.");}
 refresh(id.data);return {status:"success",message:"Attachment added."};
 }catch(e){return {status:"error",message:e instanceof Error?e.message:"The upload failed. Try again."};}
}
export async function deletePlanAttachment(input:unknown){
 const d=z.object({id:z.uuid(),planId:z.uuid()}).safeParse(input);if(!d.success)return {ok:false,message:"Invalid attachment."};
 try{const c=await planContext();if(c.kind!=="database")throw new Error("Attachments require your connected account.");
 const {data:a,error}=await c.db.from("plan_attachments").select("id,object_path").eq("id",d.data.id).eq("plan_id",d.data.planId).maybeSingle();if(error||!a)throw new Error("That attachment is no longer available.");
 const removed=await c.db.storage.from("plan-attachments").remove([a.object_path]);if(removed.error)throw new Error("We couldn't remove the file. Try again.");
 const deleted=await c.db.from("plan_attachments").delete().eq("id",a.id);if(deleted.error)throw new Error("We couldn't finish removing the attachment. Try again.");
 refresh(d.data.planId);return {ok:true,message:"Attachment removed."};
 }catch(e){return {ok:false,message:e instanceof Error?e.message:"Unable to remove attachment."};}
}
