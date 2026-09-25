import "server-only";
import { coupleContext } from "@/lib/couple/context";
import { readDeveloperState } from "@/lib/auth/dev-session";
import type { StoryCounts, StoryCursor, StoryEntry, StoryItem, StoryKind, StoryOverview, StoryView } from "./schema";
import { decodeCursor, storyExcerpt, storyPageSize } from "./schema";

const columns = "kind,id,couple_id,occurred_on,title,location,source_bucket_item_id,source_plan_id" as const;
const kinds: StoryKind[] = ["memory", "milestone", "plan", "bucket"];
const photosPerEntry = 3;

type Detail = { photos: string[]; excerpt: string | null; author: "me" | "partner" | null };
type DetailRow = { id: string; description: string | null; created_by: string; memory_media?: { id: string }[]; milestone_media?: { id: string }[] };
type Db = Extract<Awaited<ReturnType<typeof coupleContext>>, { kind: "database" }>["db"];

/**
 * One page of the shared timeline, newest first.
 *
 * The read goes through public.story_entries, a security_invoker view, so every row
 * still passes the underlying table's own policy as this member. Notes and wishlists
 * are not part of the view at all, so no private note and no purchase secret can
 * appear here regardless of what this function does.
 *
 * Pagination is keyset on (occurred_on desc, id desc) rather than an offset, so an
 * entry added while someone is reading cannot duplicate or skip a row. The extra row
 * fetched beyond the page size is the "is there more" probe, matching how bucket and
 * plans already page.
 *
 * Memories and moments on the page are then read once more, as a batch, for their
 * first three ready photos, the opening of their story and who kept them. Those
 * reads go to the tables themselves, under the same member policies, and the photo
 * ids only ever become addresses on the authorized media route.
 */
export async function loadStory(cursor: StoryCursor | null = null): Promise<StoryView> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return previewStory(cursor);
    if (!context.coupleId) return { paired: false, entries: [], next: null };
    const { db, coupleId, userId } = context;

    let query = db
      .from("story_entries")
      .select(columns)
      .eq("couple_id", coupleId)
      .order("occurred_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(storyPageSize + 1);

    // Strictly older than the cursor, with id breaking ties on a shared date.
    if (cursor) {
      query = query.or(`occurred_on.lt.${cursor.occurredOn},and(occurred_on.eq.${cursor.occurredOn},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as StoryEntry[];
    const page = rows.slice(0, storyPageSize);
    const last = page.at(-1);
    const next = rows.length > storyPageSize && last ? { occurredOn: last.occurred_on, id: last.id } : null;

    const memoryIds = page.filter((entry) => entry.kind === "memory").map((entry) => entry.id);
    const momentIds = page.filter((entry) => entry.kind === "milestone").map((entry) => entry.id);

    const [memories, moments, overview] = await Promise.all([
      memoryIds.length
        ? db.from("memories").select("id,description,created_by,memory_media(id)").in("id", memoryIds)
          .eq("memory_media.state", "ready").eq("memory_media.media_type", "image")
          .order("created_at", { referencedTable: "memory_media", ascending: true })
          .limit(photosPerEntry, { referencedTable: "memory_media" })
        : Promise.resolve({ data: [] as DetailRow[] }),
      momentIds.length
        ? db.from("milestones").select("id,description,created_by,milestone_media(id)").in("id", momentIds)
          .eq("milestone_media.state", "ready").eq("milestone_media.media_type", "image")
          .order("created_at", { referencedTable: "milestone_media", ascending: true })
          .limit(photosPerEntry, { referencedTable: "milestone_media" })
        : Promise.resolve({ data: [] as DetailRow[] }),
      // Read on every page: later pages still need the start date for their
      // chapter numbers and for the page that ends where the story began.
      loadOverview(db, coupleId, userId),
    ]);

    // Detail is decoration: if either batch fails the timeline still reads.
    const details = new Map<string, Detail>();
    for (const row of [...((memories.data ?? []) as DetailRow[]), ...((moments.data ?? []) as DetailRow[])]) {
      details.set(row.id, {
        photos: (row.memory_media ?? row.milestone_media ?? []).map((media) => media.id),
        excerpt: storyExcerpt(row.description),
        author: row.created_by === userId ? "me" : "partner",
      });
    }

    return { paired: true, entries: page.map((entry) => enrich(entry, details.get(entry.id))), next, overview };
  } catch {
    return { paired: false, entries: [], next: null, error: "We could not open your story. Check your connection and try again." };
  }
}

function enrich(entry: StoryEntry, detail?: Detail): StoryItem {
  return { ...entry, photos: detail?.photos ?? [], excerpt: detail?.excerpt ?? null, author: detail?.author ?? null };
}

async function loadOverview(db: Db, coupleId: string, userId: string): Promise<StoryOverview | undefined> {
  try {
    const [couple, profile, ...totals] = await Promise.all([
      db.from("couples").select("relationship_started_on").eq("id", coupleId).maybeSingle(),
      db.from("profiles").select("relationship_started_on").eq("user_id", userId).maybeSingle(),
      ...kinds.map((kind) => db.from("story_entries").select("id", { count: "exact", head: true }).eq("couple_id", coupleId).eq("kind", kind)),
    ]);
    const counts = Object.fromEntries(kinds.map((kind, i) => [kind, totals[i].count ?? 0])) as StoryCounts;
    // Home reads the couple's date first and the profile's as a fallback; so does this.
    return { counts, startedOn: couple.data?.relationship_started_on ?? profile.data?.relationship_started_on ?? null };
  } catch {
    return undefined;
  }
}

/**
 * The developer preview's story, built from its own local state: moments,
 * memories and completed plans. Its photos live in this browser's storage, so
 * the page loads them client-side through the preview session.
 */
async function previewStory(cursor: StoryCursor | null): Promise<StoryView> {
  const state = await readDeveloperState();
  if (state.coupleStatus !== "paired") return { paired: false, entries: [], next: null };
  const item = (kind: StoryKind, id: string, occurred_on: string, title: string, location: string | null, description: string | null): StoryItem => ({
    kind, id, couple_id: "preview", occurred_on, title, location,
    source_bucket_item_id: null, source_plan_id: null,
    photos: [], excerpt: storyExcerpt(description), author: kind === "memory" || kind === "milestone" ? "me" : null,
  });
  const all: StoryItem[] = [
    ...state.milestones.map((m) => item("milestone", m.id, m.milestoneDate, m.title, m.location ?? null, m.description)),
    ...state.memories.map((m) => ({ ...item("memory", m.id, m.memoryDate, m.title, m.location || null, m.description), source_plan_id: m.sourcePlanId, source_bucket_item_id: m.sourceBucketId ?? null })),
    // As in the database view, a kept plan is told by its memory once one exists.
    ...state.plans.filter((p) => p.status === "completed" && !state.memories.some((m) => m.sourcePlanId === p.id)).map((p) => item("plan", p.id, p.startsAt.slice(0, 10), p.title, p.location || null, null)),
  ].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.id.localeCompare(a.id));
  const rows = all.filter((e) => !cursor || e.occurred_on < cursor.occurredOn || (e.occurred_on === cursor.occurredOn && e.id < cursor.id));
  const page = rows.slice(0, storyPageSize);
  const last = page.at(-1);
  const counts = Object.fromEntries(kinds.map((kind) => [kind, all.filter((e) => e.kind === kind).length])) as StoryCounts;
  return {
    paired: true,
    entries: page,
    next: rows.length > storyPageSize && last ? { occurredOn: last.occurred_on, id: last.id } : null,
    overview: { counts, startedOn: state.relationshipStartedOn || null },
    previewSession: state.bucketSessionId,
  };
}

/** Reads the `after` search param, ignoring anything that is not a real cursor. */
export function cursorFromParam(value: string | string[] | undefined): StoryCursor | null {
  return typeof value === "string" ? decodeCursor(value) : null;
}
