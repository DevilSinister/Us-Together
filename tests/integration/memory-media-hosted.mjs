// Explicit hosted gate. The fixture file is generated outside version control and removed after use.
import {readFileSync,writeFileSync} from "node:fs";
import {createClient} from "@supabase/supabase-js";
import {Image} from "imagescript";
const env=Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>/^[A-Z][A-Z0-9_]*=/.test(l)).map(l=>{const i=l.indexOf("=");return[l.slice(0,i),l.slice(i+1).replace(/^["']|["']$/g,"")];}));
const fixture=JSON.parse(readFileSync(process.env.PHASE6_FIXTURE_FILE??"supabase/.temp/phase6-fixture.json","utf8"));
let checks=0;
function check(value,name){if(!value)throw new Error(name);checks++;console.log("PASS "+name);}
const clients=fixture.users.map(()=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}}));
async function call(db,body){const r=await db.functions.invoke("memory-media",{body});if(r.error){let detail="";try{const body=await r.error.context.json();detail=body.error??body.message??"";}catch{}return {error:detail||r.error.message};}return r.data;}
const created=[];
try{
 for(let i=0;i<3;i++){const {error}=await clients[i].auth.signInWithPassword(fixture.users[i]);check(!error,"fixture "+i+" authenticated");}
 const [own,partner,foreign]=clients;
 const image=new Image(320,240);image.fill(0x6f1730ff);
 const png=await image.encode();writeFileSync("tests/fixtures/phase6-fixture.png",png);
 const prepare=await call(own,{operation:"prepare",memoryId:fixture.memory,filename:"fixture.png",mime:"image/png",size:png.length,caption:"Fictional test swatch"});
 check(!!prepare.id,"authorized upload preparation"+(prepare.error?": "+prepare.error:""));created.push(prepare.id);
 const badParent=await call(foreign,{operation:"prepare",memoryId:fixture.memory,filename:"fixture.png",mime:"image/png",size:png.length});
 check(!!badParent.error,"foreign parent preparation denied");
 const forged=await own.from("memory_media").update({state:"ready"}).eq("id",prepare.id);check(!!forged.error,"browser cannot forge finalization");
 const randomPath=prepare.path.replace(prepare.id,crypto.randomUUID());
 const unallocated=await own.storage.from("memory-media").upload(randomPath,png,{contentType:"image/png"});check(!!unallocated.error,"unallocated object path denied");
 const upload=await own.storage.from("memory-media").upload(prepare.path,png,{contentType:"image/png"});check(!upload.error,"real private PNG upload");
 const replace=await own.storage.from("memory-media").upload(prepare.path,png,{contentType:"image/png",upsert:true});check(!!replace.error,"immutable upload cannot be overwritten");
 const foreignRead=await foreign.storage.from("memory-media").download(prepare.path);check(!!foreignRead.error,"foreign binary download denied");
 const foreignFinalize=await call(foreign,{operation:"finalize",memoryId:fixture.memory,id:prepare.id});check(!!foreignFinalize.error,"foreign finalization denied");
 const finalize=await call(own,{operation:"finalize",memoryId:fixture.memory,id:prepare.id});check(finalize.ok,"PNG validation and derivative publication"+(finalize.error?": "+finalize.error:""));
 const again=await call(own,{operation:"finalize",memoryId:fixture.memory,id:prepare.id});check(again.ok,"finalization safely retries");
 const {data:row}=await own.from("memory_media").select("*").eq("id",prepare.id).single();
 check(row?.state==="ready"&&row.width===320&&row.height===240&&!!row.derivative_path,"validated media dimensions persisted");
 const derivative=await partner.storage.from("memory-media").download(row.derivative_path);check(!derivative.error&&derivative.data.type==="image/jpeg","partner can read actual private derivative");
 const signed=await partner.storage.from("memory-media").createSignedUrl(row.storage_path,5);check(!signed.error,"short-lived signed viewer authorization");
 check((await fetch(signed.data.signedUrl)).ok,"signed original fetch");
 await new Promise(resolve=>setTimeout(resolve,6500));
 check(!(await fetch(signed.data.signedUrl,{cache:"no-store"})).ok,"expired signed URL denied");
 const blocked=await own.from("memories").delete().eq("id",fixture.memory);check(!!blocked.error,"memory deletion blocked until binary cleanup");
 const invalid=new TextEncoder().encode("<script>invalid image payload</script>");
 const rejected=await call(own,{operation:"prepare",memoryId:fixture.memory,filename:"invalid.png",mime:"image/png",size:invalid.length});
 check(!!rejected.id,"pending invalid test allocated");created.push(rejected.id);
 await own.storage.from("memory-media").upload(rejected.path,invalid,{contentType:"image/png"});
 const invalidFinal=await call(own,{operation:"finalize",memoryId:fixture.memory,id:rejected.id});check(!!invalidFinal.error,"spoofed image signature rejected");
 const {data:failed}=await own.from("memory_media").select("state").eq("id",rejected.id).single();check(failed?.state==="failed","failed upload remains recoverable");
 for (const [extension,mime] of [["mp4","video/mp4"],["webm","video/webm"]]) {
  const video=readFileSync(".impeccable/qa/phase6-video."+extension);
  const preparedVideo=await call(own,{operation:"prepare",memoryId:fixture.memory,filename:"fixture."+extension,mime,size:video.length});
  check(!!preparedVideo.id,extension+" upload allocated");created.push(preparedVideo.id);
  const uploadedVideo=await own.storage.from("memory-media").upload(preparedVideo.path,video,{contentType:mime});check(!uploadedVideo.error,extension+" binary uploaded");
  const finalizedVideo=await call(own,{operation:"finalize",memoryId:fixture.memory,id:preparedVideo.id});check(finalizedVideo.ok,extension+" container verified"+(finalizedVideo.error?": "+finalizedVideo.error:""));
 }
 const missing=await call(own,{operation:"prepare",memoryId:fixture.memory,filename:"interrupted.png",mime:"image/png",size:png.length});
 created.push(missing.id);
 const missingFinal=await call(own,{operation:"finalize",memoryId:fixture.memory,id:missing.id});check(!!missingFinal.error,"interrupted upload is not published");
} catch(e){console.error("FAIL "+e.message);process.exitCode=1;}
finally{
 for(const id of created.filter(Boolean)){
  const result=await call(clients[0],{operation:"remove",memoryId:fixture.memory,id});
  if(!result.ok){console.error("FAIL fixture media cleanup");process.exitCode=1;}else{checks++;console.log("PASS stored binary and metadata cleanup");}
 }
 for(const client of clients)await client.auth.signOut();
 console.log("Hosted media checks: "+checks);
}
