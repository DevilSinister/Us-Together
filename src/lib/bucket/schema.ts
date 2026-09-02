import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
export const bucketStatuses = ["idea", "planned", "in_progress", "completed"] as const;
export const bucketPriorities = ["low", "medium", "high", "dream"] as const;
export const DEFAULT_BUCKET_CATEGORIES = [
  "Travel & Getaways",
  "Food & Dining",
  "Little Rituals",
  "Outdoors & Adventures",
  "Home & Cozy",
  "Arts & Culture",
  "Milestones",
] as const;
export const bucketPageSize = 12;

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a real calendar date.");
export const bucketItemSchema = z.object({
  listId: z.uuid(), title: z.string().trim().min(1, "Give your idea a name.").max(160),
  description: optionalText(4000), category: optionalText(80),
  priority: z.enum(bucketPriorities), status: z.enum(bucketStatuses),
  cost: z.union([z.literal(""), z.string().regex(/^\d{1,9}(?:\.\d{1,2})?$/, "Use an amount with up to two decimal places.")]),
  currency: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)]),
  targetDate: z.union([z.literal(""), dateOnly]).transform((value) => value || null), location: optionalText(240),
}).refine((value) => (value.cost === "") === (value.currency === ""), { path: ["currency"], message: "Add both an amount and currency." });
export const bucketFilterSchema = z.object({
  listId: z.union([z.literal(""), z.uuid()]), status: z.union([z.literal(""), z.enum(bucketStatuses)]),
  priority: z.union([z.literal(""), z.enum(bucketPriorities)]), category: z.string().trim().max(80), before: z.uuid().nullable().default(null),
});
export const bucketMutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("createList"), title: z.string().trim().min(1).max(120) }),
  z.object({ operation: z.literal("renameList"), id: z.uuid(), title: z.string().trim().min(1).max(120) }),
  z.object({ operation: z.literal("deleteList"), id: z.uuid(), confirmation: z.literal("DELETE") }),
  z.object({ operation: z.literal("createItem"), item: bucketItemSchema }),
  z.object({ operation: z.literal("updateItem"), id: z.uuid(), version: z.number().int().nonnegative(), item: bucketItemSchema }),
  z.object({ operation: z.literal("deleteItem"), id: z.uuid(), version: z.number().int().nonnegative(), confirmation: z.literal("DELETE") }),
  z.object({ operation: z.literal("completeItem"), id: z.uuid(), version: z.number().int().nonnegative() }),
  z.object({ operation: z.literal("subtask"), id: z.uuid(), version: z.number().int().nonnegative(), kind: z.enum(["add", "update", "delete", "reorder"]), subtaskId: z.uuid().nullable(), label: z.string().trim().max(240), completed: z.boolean(), orderedIds: z.array(z.uuid()).max(50) }),
]);
export type BucketFilter = z.infer<typeof bucketFilterSchema>;
export type BucketMutation = z.infer<typeof bucketMutationSchema>;
export type BucketList = Pick<Database["public"]["Tables"]["bucket_lists"]["Row"], "id" | "title">;
export type BucketSubtask = Database["public"]["Tables"]["bucket_item_subtasks"]["Row"];
export type BucketItem = Database["public"]["Tables"]["bucket_list_items"]["Row"];
export type BucketPage = { items: BucketItem[]; next: string | null };
export function subtaskProgress(subtasks: Pick<BucketSubtask, "is_completed">[]) {
  const completed = subtasks.filter((task) => task.is_completed).length;
  return { completed, total: subtasks.length, percent: subtasks.length ? Math.round(completed / subtasks.length * 100) : 0 };
}
export function moveSubtask(ids: string[], id: string, direction: -1 | 1) {
  const index = ids.indexOf(id); const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= ids.length) return ids;
  const result = [...ids]; [result[index], result[destination]] = [result[destination], result[index]]; return result;
}
