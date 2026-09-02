"use server";
import {z} from "zod";
import {planContext} from "@/lib/plans/data";
import {photonPlaces,type PlaceSuggestion} from "@/lib/entries/location";
const requestSchema=z.discriminatedUnion("operation",[
 z.object({operation:z.literal("search"),query:z.string().trim().min(3).max(200)}),
 z.object({operation:z.literal("nearby"),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}),
 z.object({operation:z.literal("status")})
]);
const previewLimits=new Map<string,{start:number;count:number}>();
let lastRequest=0;
export async function searchPlaces(input:unknown):Promise<{configured?:boolean;places?:PlaceSuggestion[];error?:string}>{
 try{
 const v=requestSchema.parse(input),c=await planContext();if(!c.paired)return {error:"Open your shared space first."};
 if(process.env.LOCATION_SEARCH_ENABLED==="false")return {configured:false,places:[]};
 if(v.operation==="status")return {configured:true};
 if(c.kind==="database"){const {data,error}=await c.db.rpc("consume_memory_media_budget",{kind:"location"});if(error||!data)return {error:"Location search is busy. Try again in a minute."};}
 else {const now=Date.now();for(const [id,b] of previewLimits)if(now-b.start>=60000)previewLimits.delete(id);const b=previewLimits.get(c.state.bucketSessionId)??{start:now,count:0};if(++b.count>30)return {error:"Try again in a minute."};previewLimits.set(c.state.bucketSessionId,b);}
 // Avoid bursts on the public community service; the database also bounds each signed-in caller.
 if(Date.now()-lastRequest<750)return {error:"Please wait a moment before searching again."};lastRequest=Date.now();
 const base=new URL(process.env.PHOTON_BASE_URL||"https://photon.komoot.io");if(base.protocol!=="https:"||base.username||base.password)throw Error("Invalid provider configuration");
 const url=new URL(v.operation==="search"?"/api/":"/reverse",base);url.searchParams.set("limit","5");url.searchParams.set("lang","en");
 if(v.operation==="search")url.searchParams.set("q",v.query);else{url.searchParams.set("lat",String(v.latitude));url.searchParams.set("lon",String(v.longitude));}
 const response=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"UsTogether/1.0 (personal shared calendar)"},cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!response.ok)return {error:"Location search is unavailable right now. Try again later or enter a place name."};
 return {configured:true,places:photonPlaces(await response.json())};
 }catch{return {error:"Could not find places. Check your connection or enter the place name."};}
}
