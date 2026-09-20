import "server-only";
import { coupleContext, partnerName } from "@/lib/couple/context";
import { decodeCursor, encodeCursor, keysetFilter, keysetFilterAfter } from "@/lib/pagination/cursor";

export type DrawingNote = {
  id: string;
  author_id: string;
  recipient_id: string;
  sent_at: string | null;
  mine: boolean;
  /** True for the author, and for a recipient who has opened the drawing. */
  read: boolean;
};

export type DrawingsView = {
  paired: boolean;
  notes: DrawingNote[];
  next: string | null;
  partner: string | null;
  error?: string;
};

export type DrawingDetail = DrawingNote & {
  partner: string | null;
  older: string | null;
  newer: string | null;
};

const PAGE = 25;
const columns = "id,author_id,recipient_id,sent_at" as const;
const unpaired: DrawingsView = { paired: false, notes: [], next: null, partner: null };

/**
 * Row level security decides what comes back: a drawing is visible to its author and,
 * once ready, to its recipient. Read state is a separate recipient-owned row, looked up
 * only for the drawings on this page.
 */
export async function loadDrawings(after?: string): Promise<DrawingsView> {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return unpaired;
  let query = context.db.from("drawing_notes").select(columns)
    .eq("couple_id", context.coupleId).eq("status", "ready")
    .order("sent_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
  const cursor = decodeCursor(after);
  if (cursor) query = query.or(keysetFilter("sent_at", cursor));
  const [{ data, error }, partner] = await Promise.all([query, partnerName(context)]);
  if (error) return { paired: true, notes: [], next: null, partner, error: "Could not load drawings. Try again." };

  const rows = data ?? [];
  const page = rows.slice(0, PAGE);
  const last = page.at(-1);
  const next = rows.length > PAGE && last?.sent_at ? encodeCursor(last.sent_at, last.id) : null;

  const received = page.filter((row) => row.author_id !== context.userId).map((row) => row.id);
  const opened = new Set<string>();
  if (received.length) {
    const { data: reads } = await context.db.from("drawing_reads").select("drawing_id")
      .eq("user_id", context.userId).in("drawing_id", received);
    for (const row of reads ?? []) opened.add(row.drawing_id);
  }
  return {
    paired: true, next, partner,
    notes: page.map((row) => {
      const mine = row.author_id === context.userId;
      return { ...row, mine, read: mine || opened.has(row.id) };
    }),
  };
}

export async function loadDrawing(id: string): Promise<DrawingDetail | null> {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return null;
  const { data } = await context.db.from("drawing_notes").select(columns)
    .eq("id", id).eq("status", "ready").maybeSingle();
  if (!data) return null;
  const mine = data.author_id === context.userId;

  // Opening a received drawing records read state once. The table has no UPDATE grant,
  // so this must stay an insert-or-ignore; an upsert that updated would fail with 42501.
  if (!mine) {
    const { error } = await context.db.from("drawing_reads")
      .upsert({ drawing_id: id, user_id: context.userId }, { onConflict: "drawing_id,user_id", ignoreDuplicates: true });
    if (error) console.error("drawing_reads insert failed", { code: error.code });
  }

  const neighbours = data.sent_at
    ? await Promise.all([
      context.db.from("drawing_notes").select("id").eq("couple_id", context.coupleId).eq("status", "ready")
        .or(keysetFilter("sent_at", { time: data.sent_at, id })).order("sent_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
      context.db.from("drawing_notes").select("id").eq("couple_id", context.coupleId).eq("status", "ready")
        .or(keysetFilterAfter("sent_at", { time: data.sent_at, id })).order("sent_at", { ascending: true }).order("id", { ascending: true }).limit(1).maybeSingle(),
    ])
    : [{ data: null }, { data: null }];
  const partner = await partnerName(context);
  return { ...data, mine, read: true, partner, older: neighbours[0].data?.id ?? null, newer: neighbours[1].data?.id ?? null };
}

/** What the editor page needs: whether sending is possible here, and who receives it. */
export async function loadDrawingWorkspace(): Promise<{ state: "preview" | "unpaired" | "paired"; partner: string | null }> {
  const context = await coupleContext();
  if (context.kind === "preview") return { state: "preview", partner: null };
  if (!context.coupleId) return { state: "unpaired", partner: null };
  return { state: "paired", partner: await partnerName(context) };
}
