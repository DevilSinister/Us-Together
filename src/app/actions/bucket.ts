"use server";
import { revalidatePath } from "next/cache";
import { bucketContext, loadBucketPage } from "@/lib/bucket/data";
import { saveBucketPreview } from "@/lib/bucket/preview";
import { bucketMutationSchema, type BucketPage } from "@/lib/bucket/schema";
import { moneyToMinorUnits } from "@/lib/dream/schema";
import { readDeveloperState, writeDeveloperState } from "@/lib/auth/dev-session";

type BucketDatabaseError = { code?: string; message?: string } | null;

function bucketSaveError(error: BucketDatabaseError): never {
  if (!error) throw new Error("We couldn't save the change. Reload and try again.");

  if (error.code === "40001") {
    throw new Error("This idea changed. Reload it before saving.");
  }
  if (error.code === "42501" || error.code === "PGRST301" || error.code === "PGRST303") {
    throw new Error("Your sign-in is no longer valid. Reload this page, then sign in again.");
  }
  if (error.message?.includes("at most 100 lists")) {
    throw new Error("This shared space already has 100 lists. Rename or remove an empty list before adding another.");
  }
  if (error.code === "23503") {
    throw new Error("Your shared space changed before this could be saved. Reload this page and try again.");
  }

  throw new Error("We couldn't save the change. Reload and try again.");
}

export async function filterBucketItems(input: unknown): Promise<{ page?: BucketPage; error?: string }> {
  try { return { page: await loadBucketPage(input) }; }
  catch { return { error: "We couldn't load your ideas. Check your connection and try again." }; }
}
export async function mutateBucket(input: unknown): Promise<{ ok: boolean; message: string; id?: string }> {
  const parsed = bucketMutationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const command = parsed.data;
  try {
    const context = await bucketContext();
    let id: string | undefined = "id" in command ? command.id : undefined;
    const changes = "item" in command ? {
      list_id: command.item.listId, title: command.item.title, description: command.item.description,
      category: command.item.category, priority: command.item.priority, status: command.item.status,
      estimated_cost_minor: moneyToMinorUnits(command.item.cost), currency: command.item.currency || null,
      target_date: command.item.targetDate, location: command.item.location,
    } : null;
    if (context.kind === "preview") {
      const { preview } = context;
      const item = preview.items.find((row) => row.id === id);
      if ("version" in command && (!item || (item.version !== command.version && !(command.operation === "completeItem" && item.status === "completed")))) throw new Error("This idea changed. Reload it before saving.");
      if (command.operation === "createList") {
        if (preview.lists.length >= 100) throw new Error("This space has reached its 100-list limit.");
        id = crypto.randomUUID(); preview.lists.push({ id, title: command.title });
      } else if (command.operation === "renameList" || command.operation === "deleteList") {
        const list = preview.lists.find((row) => row.id === id);
        if (!list) throw new Error("List unavailable.");
        if (command.operation === "renameList") list.title = command.title;
        else {
          if (preview.items.some((row) => row.list_id === id)) throw new Error("Move or delete this list's ideas first.");
          preview.lists = preview.lists.filter((row) => row.id !== id);
        }
      } else if (changes) {
        if (!preview.lists.some((row) => row.id === changes.list_id)) throw new Error("List unavailable.");
        const now = new Date().toISOString();
        const completion = changes.status === "completed" ? { completed_at: item?.completed_at ?? now, completed_by: context.userId } : { completed_at: null, completed_by: null };
        if (command.operation === "createItem") {
          if (preview.items.length >= 100) throw new Error("This preview has reached its 100-idea limit.");
          id = crypto.randomUUID(); preview.items.push({ ...changes, ...completion, id, couple_id: context.userId, created_by: context.userId, created_at: now, updated_at: now, version: 0 });
        } else Object.assign(item!, changes, completion, { version: item!.version + 1 });
      } else if (command.operation === "deleteItem") {
        preview.items = preview.items.filter((row) => row.id !== id);
        preview.subtasks = preview.subtasks.filter((row) => row.item_id !== id);
        const state = await readDeveloperState();
        await writeDeveloperState({ ...state, plans: state.plans.map((plan) => plan.sourceBucketId === id ? { ...plan, sourceBucketId: undefined } : plan), memories: state.memories.map((memory) => memory.sourceBucketId === id ? { ...memory, sourceBucketId: undefined } : memory) });
      } else if (command.operation === "completeItem" && item!.status !== "completed") {
        Object.assign(item!, { status: "completed", completed_at: new Date().toISOString(), completed_by: context.userId, version: item!.version + 1 });
      } else if (command.operation === "subtask") {
        const tasks = preview.subtasks.filter((task) => task.item_id === id);
        const task = tasks.find((task) => task.id === command.subtaskId);
        if (["add", "update"].includes(command.kind) && !command.label) throw new Error("Give this step a name.");
        if (command.kind === "add") {
          if (tasks.length >= 50) throw new Error("An idea can have at most 50 steps.");
          const now = new Date().toISOString();
          preview.subtasks.push({ id: crypto.randomUUID(), item_id: id!, label: command.label, is_completed: false, position: Math.max(-1, ...tasks.map((task) => task.position)) + 1, created_at: now, updated_at: now });
        } else if (command.kind === "reorder") {
          if (command.orderedIds.length !== tasks.length || new Set(command.orderedIds).size !== tasks.length || command.orderedIds.some((id) => !tasks.some((task) => task.id === id))) throw new Error("The steps changed. Reload before reordering.");
          command.orderedIds.forEach((id, index) => { tasks.find((task) => task.id === id)!.position = index; });
        } else {
          if (!task) throw new Error("Step unavailable.");
          if (command.kind === "update") Object.assign(task, { label: command.label, is_completed: command.completed });
          else preview.subtasks = preview.subtasks.filter((row) => row.id !== task.id);
        }
        item!.version += 1;
      }
    } else {
      const { db, coupleId } = context;
      const check = (error: BucketDatabaseError) => { if (error) bucketSaveError(error); };
      if (command.operation === "createList") {
        const { data, error } = await db.from("bucket_lists").insert({
          title: command.title,
          couple_id: coupleId,
          created_by: context.userId,
        }).select("id").single(); check(error); id = data!.id;
      } else if (command.operation === "renameList") {
        const { data, error } = await db.from("bucket_lists").update({ title: command.title }).eq("id", command.id).eq("couple_id", coupleId).select("id").maybeSingle(); check(error); if (!data) throw new Error("List unavailable.");
      } else if (command.operation === "deleteList") {
        const { error } = await db.rpc("delete_empty_bucket_list", { target_list: command.id }); check(error);
      } else if (command.operation === "subtask") {
        const { error } = await db.rpc("mutate_bucket_subtask", { target_item: command.id, expected_version: command.version, operation: command.kind, target_subtask: command.subtaskId ?? undefined, task_label: command.label, completed: command.completed, ordered_ids: command.orderedIds }); check(error);
      } else if (command.operation === "createItem") {
        const { data, error } = await db.from("bucket_list_items").insert({ ...changes!, couple_id: coupleId, created_by: context.userId }).select("id").single(); check(error); id = data!.id;
      } else {
        if (command.operation === "completeItem") {
          const { data, error } = await db.from("bucket_list_items").select("status").eq("id", command.id).eq("couple_id", coupleId).maybeSingle(); check(error);
          if (data?.status === "completed") return { ok: true, message: "This dream is already completed.", id };
        }
        const query = command.operation === "deleteItem" ? db.from("bucket_list_items").delete() : db.from("bucket_list_items").update(command.operation === "completeItem" ? { status: "completed" } : changes!);
        const { data, error } = await query.eq("id", command.id).eq("couple_id", coupleId).eq("version", command.version).select("id").maybeSingle(); check(error);
        if (!data) throw new Error("This idea changed or is no longer available. Reload before saving.");
      }
    }
    if (context.kind === "preview") await saveBucketPreview(context.userId, context.preview);
    revalidatePath("/bucket/lists/[listId]", "page");
    revalidatePath("/bucket"); if (id) revalidatePath(`/bucket/${id}`); revalidatePath("/home");
    return { ok: true, message: command.operation === "completeItem" ? "One more dream lived. Keep the memory when you're ready." : "Saved.", id };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "We couldn't save this change. Try again." };
  }
}
