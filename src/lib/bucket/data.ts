import "server-only";
import { z } from "zod";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bucketPreview } from "./preview";
import {
  DEFAULT_BUCKET_CATEGORIES,
  bucketFilterSchema,
  bucketPageSize,
  type BucketItem,
  type BucketList,
  type BucketPage,
} from "./schema";


export async function bucketContext() {
  const identity = await getCurrentIdentity();
  if (!identity) throw new Error("Sign in again to open your bucket lists.");
  if (identity.kind === "developer") {
    const state = await readDeveloperState();
    if (state.coupleStatus === "solo") throw new Error("Create a shared space first.");
    return { kind: "preview" as const, preview: await bucketPreview(state.bucketSessionId), userId: state.bucketSessionId };
  }
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle();
  if (error) throw new Error("We couldn't open your shared space. Try again.");
  if (!data) throw new Error("Create a shared space first.");
  return { kind: "database" as const, db, coupleId: data.couple_id, userId: identity.userId };
}

export async function loadBucketLists(): Promise<BucketList[]> {
  const context = await bucketContext();
  if (context.kind === "preview") return context.preview.lists;
  const { data, error } = await context.db.from("bucket_lists").select("id,title").eq("couple_id", context.coupleId).order("id").limit(100);
  if (error) throw new Error("We couldn't load your lists. Try again.");
  return data;
}
export async function loadBucketPage(input: unknown): Promise<BucketPage> {
  const filter = bucketFilterSchema.parse(input);
  const context = await bucketContext();
  let rows: BucketItem[];
  if (context.kind === "preview") {
    rows = context.preview.items.filter((item) => (!filter.listId || item.list_id === filter.listId) && (!filter.status || item.status === filter.status) && (!filter.priority || item.priority === filter.priority) && (!filter.category || item.category === filter.category) && (!filter.before || item.id < filter.before)).sort((a, b) => b.id.localeCompare(a.id)).slice(0, bucketPageSize + 1);
  } else {
    let query = context.db.from("bucket_list_items").select("*").eq("couple_id", context.coupleId).order("id", { ascending: false }).limit(bucketPageSize + 1);
    if (filter.listId) query = query.eq("list_id", filter.listId);
    if (filter.status) query = query.eq("status", filter.status);
    if (filter.priority) query = query.eq("priority", filter.priority);
    if (filter.category) query = query.eq("category", filter.category);
    if (filter.before) query = query.lt("id", filter.before);
    const { data, error } = await query;
    if (error) throw new Error("We couldn't load your ideas. Try again.");
    rows = data;
  }
  const items = rows.slice(0, bucketPageSize);
  return { items, next: rows.length > bucketPageSize ? items.at(-1)!.id : null };
}

export type PlannableIdea = Pick<BucketItem, "id" | "title" | "list_id">;

/**
 * Every idea that could still become a plan - anything not yet lived - for
 * the "start from your bucket list" picker on a new plan. Titles only; the
 * chosen idea is loaded in full by id.
 */
export async function loadPlannableIdeas(): Promise<PlannableIdea[]> {
  const context = await bucketContext();
  if (context.kind === "preview") {
    return context.preview.items.filter((item) => item.status !== "completed")
      .sort((a, b) => b.id.localeCompare(a.id)).slice(0, 200)
      .map(({ id, title, list_id }) => ({ id, title, list_id }));
  }
  const { data, error } = await context.db.from("bucket_list_items").select("id,title,list_id")
    .eq("couple_id", context.coupleId).neq("status", "completed").order("id", { ascending: false }).limit(200);
  if (error) throw new Error("We couldn't load your bucket list ideas. Try again.");
  return data;
}

export async function loadBucketItem(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const context = await bucketContext();
  if (context.kind === "preview") {
    const item = context.preview.items.find((candidate) => candidate.id === id);
    return item ? { item, subtasks: context.preview.subtasks.filter((task) => task.item_id === id).sort((a, b) => a.position - b.position) } : null;
  }
  const { data: item, error } = await context.db.from("bucket_list_items").select("*").eq("id", id).eq("couple_id", context.coupleId).maybeSingle();
  if (error) throw new Error("We couldn't load this idea. Try again.");
  if (!item) return null;
  const { data: subtasks, error: taskError } = await context.db.from("bucket_item_subtasks").select("*").eq("item_id", item.id).order("position").limit(50);
  if (taskError) throw new Error("We couldn't load the steps. Try again.");
  return { item, subtasks };
}


export async function loadBucketCategories(): Promise<string[]> {
  const context = await bucketContext();
  let existingCategories: string[] = [];
  if (context.kind === "preview") {
    existingCategories = context.preview.items
      .map((item) => item.category)
      .filter((cat): cat is string => Boolean(cat && cat.trim().length > 0));
  } else {
    const { data, error } = await context.db
      .from("bucket_list_items")
      .select("category")
      .eq("couple_id", context.coupleId)
      .not("category", "is", null);
    if (!error && data) {
      existingCategories = data
        .map((row) => row.category)
        .filter((cat): cat is string => Boolean(cat && cat.trim().length > 0));
    }
  }
  const set = new Set([...DEFAULT_BUCKET_CATEGORIES, ...existingCategories]);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export type BucketListSummary = BucketList & { dreams: number; lived: number };
export type LivedDream = { id: string; title: string; listTitle: string | null; livedOn: string };
export type BucketOverview = { lists: BucketListSummary[]; recent: LivedDream[]; dreams: number; lived: number };

/** Ideas counted for the lists screen: far beyond what a couple keeps, so the counts stay one read. */
const overviewItemCap = 5000;

/**
 * The lists screen in one read: each list with how many dreams it holds and
 * how many are lived, and the few most recently lived. A dream's day is the
 * day you said you lived it, or, without one, the day it was marked complete.
 */
export async function loadBucketOverview(): Promise<BucketOverview> {
  const context = await bucketContext();
  type Row = { list_id: string; status: string };
  type Done = { id: string; title: string; list_id: string; lived_on: string | null; completed_at: string | null };
  let lists: BucketList[], rows: Row[], done: Done[];
  if (context.kind === "preview") {
    lists = context.preview.lists;
    rows = context.preview.items;
    done = context.preview.items.filter((item) => item.status === "completed");
  } else {
    const [listResult, itemResult, doneResult] = await Promise.all([
      context.db.from("bucket_lists").select("id,title").eq("couple_id", context.coupleId).order("id").limit(100),
      context.db.from("bucket_list_items").select("list_id,status").eq("couple_id", context.coupleId).limit(overviewItemCap),
      context.db.from("bucket_list_items").select("id,title,list_id,lived_on,completed_at").eq("couple_id", context.coupleId).eq("status", "completed")
        .order("lived_on", { ascending: false, nullsFirst: false }).order("completed_at", { ascending: false }).limit(5),
    ]);
    if (listResult.error || itemResult.error || doneResult.error) throw new Error("We couldn't load your lists. Try again.");
    [lists, rows, done] = [listResult.data, itemResult.data, doneResult.data];
  }
  const day = (row: Done) => row.lived_on ?? row.completed_at?.slice(0, 10) ?? "";
  const titles = new Map(lists.map((list) => [list.id, list.title]));
  const summaries = lists.map((list) => {
    const own = rows.filter((row) => row.list_id === list.id);
    return { ...list, dreams: own.length, lived: own.filter((row) => row.status === "completed").length };
  });
  const recent = [...done].sort((a, b) => day(b).localeCompare(day(a))).slice(0, 5)
    .map((row) => ({ id: row.id, title: row.title, listTitle: titles.get(row.list_id) ?? null, livedOn: day(row) }));
  return {
    lists: summaries,
    recent,
    dreams: summaries.reduce((sum, list) => sum + list.dreams, 0),
    lived: summaries.reduce((sum, list) => sum + list.lived, 0),
  };
}
