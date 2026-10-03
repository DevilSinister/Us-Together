import {z} from "zod";

export const dispatchSchema=z.object({
 mode:z.enum(["deliver","validate"]).default("deliver"),
 deliveries:z.array(z.object({
  deliveryId:z.uuid(),token:z.string().min(32).max(4096),notificationId:z.uuid(),
  title:z.string().min(1).max(160),category:z.string().min(1).max(40),
  targetType:z.string().max(40).nullable(),targetId:z.uuid().nullable(),
 }).strict()).max(200),
}).strict();
