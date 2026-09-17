import "server-only";
import { coupleContext } from "@/lib/couple/context";

export type DrawingNote = {
  id: string;
  author_id: string;
  recipient_id: string;
  sent_at: string | null;
  mine: boolean;
};

function decodeCursor(input: string | undefined) {
  if (!input || input.length > 200) return null;
  try {
    const [time, id] = Buffer.from(input, "base64url").toString("utf8").split("|");
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{1,6}(?:Z|\+00:00)$/.test(time) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
        Number.isNaN(Date.parse(time))) return null;
    return { time, id };
  } catch { return null; }
}

export async function loadDrawings(after?: string) {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return { paired: false, notes: [] as DrawingNote[], next: null as string | null };
  let query = context.db.from("drawing_notes")
    .select("id,author_id,recipient_id,sent_at")
    .eq("couple_id", context.coupleId).eq("status", "ready")
    .order("sent_at", { ascending: false }).order("id", { ascending: false }).limit(25);
  const cursor = decodeCursor(after);
  if (cursor) query = query.or("sent_at.lt." + cursor.time + ",and(sent_at.eq." + cursor.time + ",id.lt." + cursor.id + ")");
  const { data, error } = await query;
  if (error) return { paired: true, notes: [] as DrawingNote[], next: null, error: "Could not load drawings. Try again." };
  const page = (data ?? []).slice(0, 24);
  const last = page.at(-1);
  const next = (data?.length ?? 0) > 24 && last?.sent_at
    ? Buffer.from(last.sent_at + "|" + last.id).toString("base64url") : null;
  return { paired: true, notes: page.map((row) => ({ ...row, mine: row.author_id === context.userId })), next };
}

export async function loadDrawing(id: string) {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return null;
  const { data } = await context.db.from("drawing_notes")
    .select("id,author_id,recipient_id,sent_at").eq("id", id).eq("status", "ready").maybeSingle();
  return data ? { ...data, mine: data.author_id === context.userId } : null;
}
