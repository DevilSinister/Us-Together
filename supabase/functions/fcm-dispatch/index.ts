import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { createHandler } from "./handler.ts";
import {dispatchSchema} from "../../../src/lib/notifications/fcm-dispatch.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{persistSession:false}});
Deno.serve(createHandler({
 parse: body => dispatchSchema.parse(body),
 env: name => Deno.env.get(name),
 fetch: globalThis.fetch,
 authorize: async secret => {
  const {data,error}=await admin.rpc("authorize_fcm_dispatch",{presented_secret:secret});
  if(error)throw Error("Authorization unavailable");
  return data === true;
 },
 settle: async results => {
  const {error}=await admin.rpc("settle_fcm_deliveries",{input:{results}});
  if(error)throw Error("Settlement unavailable");
 }
}));
