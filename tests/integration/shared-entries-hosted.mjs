import {readFileSync} from "node:fs";
import {createClient} from "@supabase/supabase-js";
const env=Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>/^[A-Z][A-Z0-9_]*=/.test(l)).map(l=>{const i=l.indexOf("=");return[l.slice(0,i),l.slice(i+1).replace(/^["']|["']$/g,"")];}));
const fixture=JSON.parse(readFileSync("supabase/.temp/phase6-fixture.json","utf8"));
const clients=fixture.users.map(()=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}}));
let checks=0,moment;const media=[];
function check(v,label){if(!v)throw Error(label);checks++;console.log("PASS "+label);}
async function call(db,body){const r=await db.functions.invoke("memory-media",{body:{...body,kind:"moment",memoryId:moment}});return r.error?{error:true}:r.data;}
try{
 for(let i=0;i<3;i++)check(!(await clients[i].auth.signInWithPassword(fixture.users[i])).error,"test account "+i+" authenticated");
 const [own,partner,foreign]=clients;const {data:parent}=await own.from("memories").select("couple_id").eq("id",fixture.memory).single();
 const {data,error}=await own.from("milestones").insert({couple_id:parent.couple_id,title:"Disposable moment integration fixture",milestone_date:"2026-09-02",type:"custom"}).select("id").single();check(!error&&data,"moment created");moment=data.id;
 const png=readFileSync("tests/fixtures/phase6-fixture.png");
 for(let i=0;i<2;i++){const p=await call(own,{operation:"prepare",filename:"fixture.png",mime:"image/png",size:png.length,caption:"Test caption "+i});check(p.id,"moment upload allocated");media.push(p.id);check(!(await own.storage.from("moment-media").upload(p.path,png,{contentType:"image/png"})).error,"private moment photo uploaded");check((await call(own,{operation:"finalize",id:p.id})).ok,"moment photo verified");}
 check((await own.from("milestone_media").select("id").eq("milestone_id",moment)).data.length===2,"multiple photos attached to same moment");
 check((await call(partner,{operation:"caption",id:media[0],caption:"Partner caption"})).ok,"partner edits caption");
 check((await partner.from("milestone_media").select("caption").eq("id",media[0]).single()).data.caption==="Partner caption","caption persisted");
 check((await call(foreign,{operation:"caption",id:media[0],caption:"Forbidden"})).error,"foreign caption edit rejected");
 const {data:row}=await partner.from("milestone_media").select("derivative_path").eq("id",media[0]).single();check(!(await partner.storage.from("moment-media").download(row.derivative_path)).error,"partner reads derivative");check((await foreign.storage.from("moment-media").download(row.derivative_path)).error,"foreign derivative denied");
 const note=await own.from("entry_comments").insert({milestone_id:moment,body:"Disposable comment"}).select("id").single();check(!note.error,"moment comment saved");check((await partner.from("entry_comments").select("id").eq("milestone_id",moment)).data.length===1,"partner reads comment");check((await foreign.from("entry_comments").select("id").eq("milestone_id",moment)).data.length===0,"foreign comment hidden");
 check((await partner.from("entry_comments").delete().eq("id",note.data.id).select("id")).data.length===0,"partner cannot remove author comment");
 check((await own.rpc("set_entry_reminder",{memory:null,moment,due:new Date(Date.now()+86400000).toISOString()})).error,"retired moment reminder denied");
 for(const mediaId of media){
 const added=await own.from("media_comments").insert({milestone_media_id:mediaId,body:"Photo-specific comment"}).select("id").single();check(!added.error,"photo comment saved");
 check((await partner.from("media_comments").select("id").eq("milestone_media_id",mediaId)).data.length===1,"partner sees correct photo comments");
 check((await foreign.from("media_comments").select("id").eq("milestone_media_id",mediaId)).data.length===0,"foreign photo comments hidden");
 check((await foreign.from("media_comments").insert({milestone_media_id:mediaId,body:"forbidden"})).error,"foreign photo comment denied");
 check((await partner.from("media_comments").delete().eq("id",added.data.id).select("id")).data.length===0,"partner cannot delete author photo comment");
 check((await partner.from("media_comments").insert({milestone_media_id:mediaId,body:"Partner reply"})).error===null,"partner can add own photo comment");
 check((await own.from("media_comments").update({body:"tamper"}).eq("id",added.data.id)).error,"photo comment editing not granted");
 }
 check((await own.from("shared_gallery").select("id").eq("entry_id",moment)).data.length===2,"gallery contains both files");
 check((await partner.from("shared_gallery").select("id").eq("entry_id",moment)).data.length===2,"partner gallery includes shared files");
 check((await foreign.from("shared_gallery").select("id").eq("entry_id",moment)).data.length===0,"foreign gallery excludes files");
 const first=(await own.from("shared_gallery").select("id,entry_date,sort_key").eq("entry_id",moment).order("entry_date",{ascending:false}).order("sort_key").limit(1)).data[0];
 const second=await own.from("shared_gallery").select("id").eq("entry_id",moment).or("entry_date.lt."+first.entry_date+",and(entry_date.eq."+first.entry_date+",sort_key.gt."+first.sort_key+")").order("entry_date",{ascending:false}).order("sort_key").limit(48);
 check(!second.error&&second.data.length===1&&second.data[0].id!==first.id,"gallery cursor advances without duplicates");
 check((await own.from("shared_gallery").select("id").eq("entry_id",moment).eq("entry_date","2026-09-02").eq("media_type","image")).data.length===2,"gallery date and photo filters match");

}catch(e){console.error("FAIL "+e.message);process.exitCode=1;}
finally{for(const id of media){check((await call(clients[0],{operation:"remove",id})).ok,"test photo removed");}if(moment){const r=await clients[0].from("milestones").delete().eq("id",moment).select("id");check(!r.error&&r.data.length===1,"temporary moment and comments removed");}for(const c of clients)await c.auth.signOut();console.log("Hosted shared-entry checks: "+checks);}
