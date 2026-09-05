import "server-only";
import { coupleContext } from "@/lib/couple/context";
import type { StoryCursor, StoryEntry, StoryView } from "./schema";
import { decodeCursor, storyPageSize } from "./schema";

const columns = "kind,id,couple_id,occurred_on,title,location,source_bucket_item_id,source_plan_id" as const;

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
 */
export async function loadStory(cursor: StoryCursor | null = null): Promise<StoryView> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview" || !context.coupleId) return { paired: false, entries: [], next: null };

    let query = context.db
      .from("story_entries")
      .select(columns)
      .eq("couple_id", context.coupleId)
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
    const entries = rows.slice(0, storyPageSize);
    const last = entries.at(-1);
    const next = rows.length > storyPageSize && last ? { occurredOn: last.occurred_on, id: last.id } : null;
    return { paired: true, entries, next };
  } catch {
    return { paired: false, entries: [], next: null, error: "We could not open your story. Check your connection and try again." };
  }
}

/** Reads the `after` search param, ignoring anything that is not a real cursor. */
export function cursorFromParam(value: string | string[] | undefined): StoryCursor | null {
  return typeof value === "string" ? decodeCursor(value) : null;
}
