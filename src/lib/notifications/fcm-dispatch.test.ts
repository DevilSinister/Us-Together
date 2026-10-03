import {beforeAll,describe,expect,it,vi} from "vitest";
import {dispatchSchema} from "./fcm-dispatch";
import {createHandler,isGone} from "../../../supabase/functions/fcm-dispatch/handler";

const id="a2000000-0000-4000-8000-000000000001";
const secret="fictional-internal-dispatch-secret-for-tests";
const delivery={deliveryId:id,notificationId:id,token:"fictional-device-token-".repeat(3),title:"New memory added",category:"memory",targetType:"memory",targetId:id};
let account:string;
beforeAll(async()=>{
 const key=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const der=await crypto.subtle.exportKey("pkcs8",key.privateKey);
 const pem="-----BEGIN PRIVATE KEY-----\n"+btoa(String.fromCharCode(...new Uint8Array(der)))+"\n-----END PRIVATE KEY-----";
 account=JSON.stringify({client_email:"fictional@example.test",private_key:pem,project_id:"fictional-project"});
});
function fixture({authorized=true,googleStatus=200,googleBody={},settleFails=false}={}){
 const fetch=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{void init;return String(input).includes("oauth2")?Response.json({access_token:"fictional-oauth",expires_in:3600}):Response.json(googleBody,{status:googleStatus});});
 const authorize=vi.fn(async()=>authorized);
 const settle=vi.fn(async()=>{if(settleFails)throw Error("private database detail");});
 const handler=createHandler({parse:body=>dispatchSchema.parse(body),env:name=>name==="FIREBASE_SERVICE_ACCOUNT_JSON"?account:undefined,authorize,settle,fetch:fetch as typeof globalThis.fetch});
 const request=(body:unknown={deliveries:[delivery]},header:string|null=secret)=>new Request("https://example.test/dispatch",{method:"POST",headers:{"content-type":"application/json",...(header?{"x-dispatch-secret":header}:{})},body:JSON.stringify(body)});
 return {fetch,authorize,settle,handler,request};
}
describe("FCM dispatcher",()=>{
 it("authenticates against Vault without requiring a duplicated Edge secret",async()=>{
  const f=fixture();const reply=await f.handler(f.request());
  expect(reply.status).toBe(200);expect(f.authorize).toHaveBeenCalledWith(secret);
  expect(f.settle).toHaveBeenCalledWith([{deliveryId:id,outcome:"delivered"}]);
  const body=JSON.parse(String(f.fetch.mock.calls[1][1]?.body));
  expect(body.message.android.priority).toBe("HIGH");expect(body.message.data.targetPath).toBe("/memories/"+id);
  expect(Object.values(body.message.data).every(value=>typeof value==="string")).toBe(true);
  expect(body.message.data.tag).toBe("us-"+id);
 });
 it("rejects missing/wrong secrets before touching Google",async()=>{
  const f=fixture({authorized:false});expect((await f.handler(f.request())).status).toBe(404);
  expect((await f.handler(f.request({},null))).status).toBe(404);expect(f.fetch).not.toHaveBeenCalled();
 });
 it("fails closed if Vault authentication is unavailable",async()=>{
  const f=fixture();f.authorize.mockRejectedValueOnce(Error("private"));
  expect((await f.handler(f.request())).status).toBe(503);expect(f.fetch).not.toHaveBeenCalled();
 });
 it("rejects malformed/oversized batches rather than silently dropping work",async()=>{
  const f=fixture();for(const body of [{deliveries:[{...delivery,targetId:"private-invalid"}]},{deliveries:Array(201).fill(delivery)},{deliveries:[{...delivery,unexpected:"private"}]}])expect((await f.handler(f.request(body))).status).toBe(400);
  expect(f.fetch).not.toHaveBeenCalled();expect(f.settle).not.toHaveBeenCalled();
 });
 it("validates with Google without sending alerts or settling deliveries",async()=>{
  const f=fixture();const reply=await f.handler(f.request({mode:"validate",deliveries:[delivery]}));
  expect(await reply.json()).toEqual({validated:1,unregistered:0,failed:0});expect(f.settle).not.toHaveBeenCalled();
  expect(JSON.parse(String(f.fetch.mock.calls[1][1]?.body)).validate_only).toBe(true);
 });
 it("can check OAuth without sending any device data",async()=>{
  const f=fixture();const reply=await f.handler(f.request({mode:"validate",deliveries:[]}));
  expect(await reply.json()).toEqual({validated:0,unregistered:0,failed:0});expect(f.fetch).toHaveBeenCalledTimes(1);expect(String(f.fetch.mock.calls[0][0])).toContain("oauth2.googleapis.com");expect(f.settle).not.toHaveBeenCalled();
 });
 it("keeps devices registered after generic 404 and IAM failures",async()=>{
  for(const googleStatus of [404,403]){const f=fixture({googleStatus,googleBody:{error:{status:"NOT_FOUND"}}});await f.handler(f.request());expect(f.settle).toHaveBeenCalledWith([{deliveryId:id,outcome:"failed"}]);}
 });
 it("retires only confirmed unregistered tokens",async()=>{
  const f=fixture({googleStatus:404,googleBody:{error:{details:[{"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError",errorCode:"UNREGISTERED"}]}}});await f.handler(f.request());expect(f.settle).toHaveBeenCalledWith([{deliveryId:id,outcome:"gone"}]);
  expect(await isGone(Response.json({error:{details:[{errorCode:"UNREGISTERED"}]}}))).toBe(false);
 });
 it("reuses OAuth tokens and exposes no credential values",async()=>{
  const f=fixture();await f.handler(f.request());const reply=await f.handler(f.request());
  expect(f.fetch).toHaveBeenCalledTimes(3);expect(await reply.text()).toBe('{"settled":1}');
 });
 it("reports an unsettled callback as retryable without raw errors",async()=>{
  const f=fixture({settleFails:true});const reply=await f.handler(f.request());expect(reply.status).toBe(503);expect(await reply.json()).toEqual({settled:0,retry:true});
 });
});
