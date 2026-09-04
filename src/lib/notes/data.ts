import "server-only";
import { coupleContext } from "@/lib/couple/context";
import type { Note, NotesView } from "./schema";

const noteColumns = "id,type,title,body,author_id,created_at,updated_at" as const;

/**
 * Row level security decides what comes back: a private note reaches only its author.
 * The query deliberately does not filter by type, so the policy stays the single
 * source of truth and a mistake here cannot widen visibility.
 */
export async function loadNotes(): Promise<NotesView> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview" || !context.coupleId) return { paired: false, notes: [] };

    const [{ data: rows, error }, { data: reads }] = await Promise.all([
      context.db.from("notes").select(noteColumns).eq("couple_id", context.coupleId).order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(200),
      context.db.from("note_reads").select("note_id").eq("user_id", context.userId).limit(500),
    ]);
    if (error) throw error;

    const read = new Set((reads ?? []).map((row) => row.note_id));
    const notes: Note[] = (rows ?? []).map((row) => ({
      ...row,
      mine: row.author_id === context.userId,
      read: row.author_id === context.userId || read.has(row.id),
    }));
    return { paired: true, notes };
  } catch {
    return { paired: false, notes: [], error: "We could not open your notes. Check your connection and try again." };
  }
}

export async function loadNote(id: string) {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return null;
  const { data } = await context.db.from("notes").select(noteColumns).eq("id", id).maybeSingle();
  if (!data) return null;
  const mine = data.author_id === context.userId;
  // Reading a shared note the viewer did not write records read state once.
  if (!mine) await context.db.from("note_reads").upsert({ note_id: id, user_id: context.userId }, { onConflict: "note_id,user_id" });
  return { ...data, mine, read: true } as Note;
}
