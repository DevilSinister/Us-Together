import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { z } from "npm:zod@4.5.4";

import { inspectMedia, validateUpload, mediaTypes } from "../../../src/lib/memories/media.ts";

const requestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("prepare"), kind: z.enum(["memory","moment"]).default("memory"), memoryId: z.uuid(), filename: z.string().min(1).max(240), mime: z.enum(mediaTypes), size: z.number().int().positive(), caption: z.string().trim().max(240).default("") }),
  z.object({ operation: z.literal("caption"), kind: z.enum(["memory","moment"]).default("memory"), memoryId: z.uuid(), id: z.uuid(), caption: z.string().trim().max(240) }),
  z.object({ operation: z.enum(["finalize", "remove"]), kind: z.enum(["memory","moment"]).default("memory"), memoryId: z.uuid(), id: z.uuid() }),
]);
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length") || 0) > 4096) return response({ error: "Request too large." }, 413);
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return response({ error: "Sign in again." }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return response({ error: "Sign in again." }, 401);
  let input: z.infer<typeof requestSchema>;
  try {
    const body = await request.text();
    if (body.length > 4096) return response({ error: "Request too large." }, 413);
    input = requestSchema.parse(JSON.parse(body));
  } catch { return response({ error: "Check the upload details." }, 400); }
  const parentTable=input.kind==="moment"?"milestones":"memories",mediaTable=input.kind==="moment"?"milestone_media":"memory_media",parentColumn=input.kind==="moment"?"milestone_id":"memory_id";
  const { data: memory } = await userClient.from(parentTable).select("id,couple_id").eq("id", input.memoryId).maybeSingle();
  if (!memory) return response({ error: "Memory unavailable." }, 404);
  // Elevated access is used only after fresh caller and parent authorization.
  if (input.operation !== "remove") {
    const {data: allowed, error: limitError} = await userClient.rpc("consume_memory_media_budget", {kind: input.operation === "prepare" ? "upload" : "process"});
    if (limitError || !allowed) return response({error: "Too many media requests. Try again later."}, 429);
  }
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const bucket = admin.storage.from(input.kind==="moment"?"moment-media":"memory-media");
  if (input.operation === "prepare") {
    try { validateUpload(input.filename, input.mime, input.size); } catch (error) { return response({ error: (error as Error).message }, 400); }
    const id = crypto.randomUUID(), path = memory.couple_id + "/" + memory.id + "/" + id + "/original";
    const { error } = await admin.from(mediaTable).insert({ id, [parentColumn]: memory.id, created_by: user.id, storage_path: path, media_type: input.mime.startsWith("image/") ? "image" : "video", mime_type: input.mime, size_bytes: input.size, caption: input.caption });
    if (error) return response({ error: "Could not start upload. Each memory allows 30 files and 300 MB in total." }, 409);
    return response({ id, path, expiresAt: new Date(Date.now() + 3600000).toISOString() });
  }
  const { data: media } = await admin.from(mediaTable).select("*").eq("id", input.id).eq(parentColumn, memory.id).maybeSingle();
  if (!media) return response({ error: "Media unavailable." }, 404);
  if(input.operation==="caption"){
    const {error}=await admin.from(mediaTable).update({caption:input.caption}).eq("id",media.id);
    return error?response({error:"Could not save caption."},503):response({ok:true});
  }
  const previewPath = media.storage_path.replace(/\/original$/, "/preview.jpg");
  if (media.state === "processing" && Date.parse(media.processing_at) > Date.now() - 300000) return response({ error: "This file is still processing. Try again shortly." }, 409);
  if (input.operation === "remove") {
    const { data: claimed } = await admin.from(mediaTable).update({ state: "deleting", processing_token: null }).eq("id", media.id).eq("state", media.state).select("id").maybeSingle();
    if (!claimed) return response({ error: "This file changed. Refresh and try again." }, 409);
    const { error: removeError } = await bucket.remove([media.storage_path, previewPath]);
    if (removeError) return response({ error: "Removal was interrupted. Retry Remove to finish safely." }, 503);
    const { error } = await admin.from(mediaTable).delete().eq("id", media.id).eq("state", "deleting");
    return error ? response({ error: "Retry Remove to finish cleanup." }, 503) : response({ ok: true });
  }
  if (media.state === "ready") return response({ ok: true });
  if (media.state === "deleting") return response({ error: "Finish removing this upload." }, 409);
  if (media.created_by !== user.id) return response({ error: "Only the uploader can finish this file." }, 403);
  if (Date.parse(media.upload_expires_at) < Date.now()) return response({ error: "This upload expired. Remove it and choose the file again." }, 409);
  const token = crypto.randomUUID();
  const { data: claimed } = await admin.from(mediaTable).update({ state: "processing", processing_at: new Date().toISOString(), processing_token: token, error_code: null }).eq("id", media.id).eq("state", media.state).select("id").maybeSingle();
  if (!claimed) return response({ error: "Processing already started. Try again shortly." }, 409);
  try {
    const { data: file, error } = await bucket.download(media.storage_path);
    if (error || !file) throw new Error("Upload has not finished. Resume it or try again.");
    if (file.size !== media.size_bytes || file.type !== media.mime_type) throw new Error("The uploaded file does not match its declared type or size.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = inspectMedia(bytes, media.mime_type);
    let derivative: string | null = null;
    if (media.media_type === "image") {
      const { ImageMagick, initializeImageMagick, MagickFormat } = await import("npm:@imagemagick/magick-wasm@0.0.43");
      let wasmBytes: Uint8Array;
      try { wasmBytes = await Deno.readFile(new URL(import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.43/x86/magick.wasm"))); }
      catch {
        // The connector bundle omits binary npm assets. Fetch only this pinned public decoder, never user media.
        const asset = await fetch("https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.43/dist/x86/magick.wasm");
        if (!asset.ok) throw new Error("Could not create the photo preview. Try again shortly.");
        wasmBytes = new Uint8Array(await asset.arrayBuffer());
      }
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(wasmBytes).buffer))).map(b=>b.toString(16).padStart(2,"0")).join("");
      if (hash !== "5a4ed1017eda113144c86ae839c22c610afebcfebfa22b1da18e00e98d78b0f7") throw new Error("Could not create the photo preview. Decoder integrity check failed.");
      await initializeImageMagick(wasmBytes);
      const jpg = ImageMagick.read(bytes, (decoded) => {
        if (decoded.width !== info.width || decoded.height !== info.height) throw new Error("Invalid image dimensions.");
        decoded.autoOrient();
        const scale = Math.min(1, 960 / Math.max(decoded.width, decoded.height));
        decoded.resize(Math.max(1, Math.round(decoded.width * scale)), Math.max(1, Math.round(decoded.height * scale)));
        decoded.strip(); decoded.quality = 80;
        return decoded.write(MagickFormat.Jpeg, (result) => new Uint8Array(result));
      });
      const { error: derivativeError } = await bucket.upload(previewPath, jpg, { contentType: "image/jpeg", upsert: false, cacheControl: "60" });
      if (derivativeError) {
        const { data: existing } = await bucket.download(previewPath);
        if (!existing) throw new Error("Could not create the photo preview. Try again.");
      }
      derivative = previewPath;
    }
    const { data: stillAllowed } = await userClient.from(parentTable).select("id").eq("id", memory.id).maybeSingle();
    if (!stillAllowed) throw new Error("Your access changed. The upload was not published.");
    const { data: published, error: publishError } = await admin.from(mediaTable).update({ state: "ready", width: info.width, height: info.height, duration_seconds: info.duration, derivative_path: derivative, processing_token: null, error_code: null }).eq("id", media.id).eq("processing_token", token).select("id").maybeSingle();
    if (publishError || !published) throw new Error("Processing changed. Refresh and try again.");
    return response({ ok: true });
  } catch (error) {
    await admin.from(mediaTable).update({ state: "failed", error_code: "processing_failed", processing_token: null }).eq("id", media.id).eq("processing_token", token);
    const safe = error instanceof Error && /^(Choose|The (photo|video|upload)|Upload has|Could not create|Your access)/.test(error.message) ? error.message : "Could not process this file. Retry or remove it and choose another.";
    return response({ error: safe }, 422);
  }
});
