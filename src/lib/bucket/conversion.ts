import "server-only";
import type { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { bucketContext } from "./data";
import { saveBucketPreview } from "./preview";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";
import { moneyToMinorUnits, type planSchema, type memorySchema } from "@/lib/dream/schema";

export async function saveBucketPlan(sourceId: string, values: z.infer<typeof planSchema>, startsAt: string, endsAt: string | null) {
  const context = await bucketContext();
  if (context.kind === "preview") {
    const source = context.preview.items.find((item) => item.id === sourceId);
    if (!source) throw new Error("That idea is no longer available.");
    const state = await readDeveloperState();
    const existing = state.plans.find((plan) => plan.sourceBucketId === sourceId);
    if (existing) return existing.id;
    if (source.status === "completed") throw new Error("This idea is already completed.");
    const id = crypto.randomUUID();
    await writeDeveloperState({ ...state, plans: [{ id, sourceBucketId: sourceId, title: values.title, description: values.description ?? "", type: values.type, status: "planned" as const, startsAt, endsAt, timezone: values.timezone, location: values.location ?? "" }, ...state.plans].slice(0, 20) });
    source.status = "planned"; source.version += 1;
    await saveBucketPreview(context.userId, context.preview);
    return id;
  }
  // PostgreSQL accepts SQL NULL here; generated RPC argument types omit nullability.
  const { data, error } = await context.db.rpc("create_plan_from_bucket", { target_item: sourceId, plan_title: values.title, plan_description: values.description, plan_type: values.type, start_time: startsAt, end_time: endsAt, timezone_name: values.timezone, plan_location: values.location, amount: moneyToMinorUnits(values.budget), currency_code: values.currency || null } as Database["public"]["Functions"]["create_plan_from_bucket"]["Args"]);
  if (error || !data) throw new Error("We couldn't turn this idea into a plan. Reload and try again.");
  return data;
}
export async function saveBucketMemory(sourceId: string, values: z.infer<typeof memorySchema>) {
  const context = await bucketContext();
  if (context.kind === "preview") {
    const source = context.preview.items.find((item) => item.id === sourceId);
    if (!source || source.status !== "completed") throw new Error("Complete the idea before saving its memory.");
    const state = await readDeveloperState();
    const existing = state.memories.find((memory) => memory.sourceBucketId === sourceId);
    if (existing) return existing.id;
    const id = crypto.randomUUID();
    await writeDeveloperState({ ...state, memories: [{ id, sourceBucketId: sourceId, sourcePlanId: null, title: values.title, description: values.description ?? "", memoryDate: values.memoryDate, location: values.location ?? "", rating: values.rating === "" ? null : values.rating, favorite: values.favorite }, ...state.memories].slice(0, 30) });
    return id;
  }
  // PostgreSQL accepts SQL NULL here; generated RPC argument types omit nullability.
  const { data, error } = await context.db.rpc("create_memory_from_bucket", { target_item: sourceId, memory_title: values.title, story: values.description, happened_on: values.memoryDate, memory_location: values.location, feeling: values.rating === "" ? null : values.rating, favorite: values.favorite } as Database["public"]["Functions"]["create_memory_from_bucket"]["Args"]);
  if (error || !data) throw new Error("We couldn't save the memory. Reload and try again.");
  return data;
}
