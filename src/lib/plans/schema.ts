import { z } from "zod";
import { planSchema, zonedLocalToUtc } from "@/lib/dream/schema";
export const editPlanSchema = planSchema.safeExtend({
  planId: z.uuid(), version: z.coerce.number().int().min(1),
  occurrence: z.enum(["reject", "earlier", "later"]).default("reject"),
});
const base = { planId: z.uuid(), version: z.number().int().min(1) };
export const planMutationSchema = z.discriminatedUnion("operation", [
  z.object({ ...base, operation: z.literal("status"), status: z.enum(["planned", "completed", "cancelled"]) }),
  z.object({ ...base, operation: z.literal("delete"), confirmation: z.literal("DELETE") }),
  z.object({ ...base, operation: z.literal("checklist"), kind: z.enum(["add", "update", "delete", "reorder"]), id: z.uuid().optional(), label: z.string().trim().min(1).max(240).optional(), completed: z.boolean().optional(), ids: z.array(z.uuid()).max(50).optional() }),
  z.object({ ...base, operation: z.literal("reminder"), kind: z.enum(["add", "delete"]), id: z.uuid().optional(), minutes: z.number().int().min(0).max(43200).optional() }),
]).superRefine((value,context) => {
  if(value.operation==="checklist") {
    if(value.kind==="add"&&!value.label) context.addIssue({code:"custom",message:"Add a step label."});
    if((value.kind==="update"||value.kind==="delete")&&!value.id) context.addIssue({code:"custom",message:"Choose a step."});
    if(value.kind==="reorder"&&!value.ids) context.addIssue({code:"custom",message:"Supply the complete order."});
    if(value.kind==="update"&&value.label===undefined&&value.completed===undefined) context.addIssue({code:"custom",message:"Supply a change."});
  }
  if(value.operation==="reminder"&&((value.kind==="add"&&value.minutes===undefined)||(value.kind==="delete"&&!value.id))) context.addIssue({code:"custom",message:"Choose a reminder."});
});
export function planInterval(data: { startsAt: string; endsAt: string; timezone: string; occurrence?: "reject" | "earlier" | "later" }) {
  const startsAt = zonedLocalToUtc(data.startsAt, data.timezone, data.occurrence);
  const endsAt = data.endsAt ? zonedLocalToUtc(data.endsAt, data.timezone, data.occurrence) : null;
  if (endsAt && endsAt < startsAt) throw new Error("The end must be on or after the start.");
  return { startsAt, endsAt };
}
export const attachmentLimit = 2 * 1024 * 1024;
export function inspectAttachment(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > attachmentLimit) throw new Error("Choose a file up to 2 MB.");
  const valid = (mime === "application/pdf" && [37,80,68,70,45].every((v,i) => bytes[i] === v)) ||
    (mime === "image/png" && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) ||
    (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255);
  if (!valid) throw new Error("Choose a valid PDF, PNG, or JPEG file.");
}
