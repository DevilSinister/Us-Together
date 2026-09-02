import { z } from "zod";
import { memorySchema } from "@/lib/dream/schema";
import { mediaTypes, validateUpload } from "./media";
export const galleryFilter = z.object({
  favorite: z.boolean().default(false),
  tag: z.string().trim().toLowerCase().max(48).default(""),
  cursor: z.object({ date: z.iso.date(), id: z.uuid() }).nullish(),
});
export const tagInput = z.string().max(400).default("").transform(v => [...new Set(v.split(",").map(t => t.trim().toLowerCase()).filter(Boolean))]).refine(v => v.length <= 8 && v.every(t => t.length <= 48), "Use up to eight tags, each under 49 characters.");
export const editMemorySchema = memorySchema.safeExtend({ id: z.uuid(), version: z.coerce.number().int().positive(), tags: tagInput });
export const mediaRequest = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("prepare"), kind:z.enum(["memory","moment"]).default("memory"), memoryId: z.uuid(), filename: z.string().min(1).max(240), mime: z.enum(mediaTypes), size: z.number().int().positive(), caption: z.string().trim().max(240).default("") }).superRefine((v,c) => { try { validateUpload(v.filename,v.mime,v.size); } catch(e) { c.addIssue({code:"custom",message:(e as Error).message}); } }),
  z.object({operation:z.literal("caption"),kind:z.enum(["memory","moment"]).default("memory"),memoryId:z.uuid(),id:z.uuid(),caption:z.string().trim().max(240)}),
  z.object({ operation: z.enum(["finalize","remove"]), kind:z.enum(["memory","moment"]).default("memory"), memoryId: z.uuid(), id: z.uuid() }),
]);
