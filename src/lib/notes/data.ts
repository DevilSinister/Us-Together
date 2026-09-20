import "server-only";
import { coupleContext, partnerName } from "@/lib/couple/context";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/cursor";
import type { Note, NotesView } from "./schema";

const PAGE = 25;
const noteColumns = "id,type,title,body,author_id,created_at,updated_at" as const;
const unpaired: NotesView = { paired: false, notes: [], next: null, partner: null };

/**
 * Row level security decides what comes back: a private note reaches only its author.
 * The query deliberately does not filter by type, so the policy stays the single
 * source of truth and a mistake here cannot widen visibility.
 *
 * Pages are keyset on (updated_at desc, id desc); read state is looked up only for the
 * partner-authored notes on this page, never through an independent window.
 */
export async function loadNotes(after?: string): Promise<NotesView> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview" || !context.coupleId) return unpaired;

    let query = context.db.from("notes").select(noteColumns).eq("couple_id", context.coupleId)
      .order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
    const cursor = decodeCursor(after);
    if (cursor) query = query.or(keysetFilter("updated_at", cursor));
    const [{ data, error }, partner] = await Promise.all([query, partnerName(context)]);
    if (error) throw error;

    const rows = data ?? [];
    const page = rows.slice(0, PAGE);
    const last = page.at(-1);
    const next = rows.length > PAGE && last ? encodeCursor(last.updated_at, last.id) : null;

    const received = page.filter((row) => row.author_id !== context.userId).map((row) => row.id);
    const read = new Set<string>();
    if (received.length) {
      const { data: reads } = await context.db.from("note_reads").select("note_id")
        .eq("user_id", context.userId).in("note_id", received);
      for (const row of reads ?? []) read.add(row.note_id);
    }
    const notes: Note[] = page.map((row) => ({
      ...row,
      mine: row.author_id === context.userId,
      read: row.author_id === context.userId || read.has(row.id),
    }));
    return { paired: true, notes, next, partner };
  } catch {
    return { ...unpaired, error: "We could not open your notes. Check your connection and try again." };
  }
}

export async function loadNote(id: string) {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return null;
  const [{ data }, partner] = await Promise.all([
    context.db.from("notes").select(noteColumns).eq("id", id).maybeSingle(),
    partnerName(context),
  ]);
  if (!data) return null;
  const mine = data.author_id === context.userId;
  // Reading a shared note the viewer did not write records read state once. note_reads
  // grants insert but not update, so this must stay an insert-or-ignore: with
  // ignoreDuplicates unset the upsert became ON CONFLICT DO UPDATE and failed with 42501
  // on every call, which is why the "New" pill never cleared.
  if (!mine) {
    const { error } = await context.db.from("note_reads")
      .upsert({ note_id: id, user_id: context.userId }, { onConflict: "note_id,user_id", ignoreDuplicates: true });
    if (error) console.error("note_reads insert failed", { code: error.code });
  }
  return { ...data, mine, read: true, partner } as Note & { partner: string | null };
}
