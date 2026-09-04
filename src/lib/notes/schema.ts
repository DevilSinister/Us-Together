import { z } from "zod";

export const noteTypes = ["shared", "private"] as const;
export type NoteType = (typeof noteTypes)[number];

export const noteTypeLabels: Record<NoteType, string> = {
  shared: "Shared with your partner",
  private: "Private to you",
};

export const noteInput = z.object({
  id: z.uuid().optional(),
  type: z.enum(noteTypes).default("shared"),
  title: z.string().trim().min(1, "Give this note a title.").max(160),
  body: z.string().trim().min(1, "Write something first.").max(20000),
});

export type NoteInput = z.output<typeof noteInput>;

export type Note = {
  id: string;
  type: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  mine: boolean;
  read: boolean;
};

export type NotesView = {
  paired: boolean;
  notes: Note[];
  error?: string;
};

/** A note body is stored and rendered as plain text. Nothing is ever parsed as markup. */
export function noteExcerpt(body: string, limit = 180) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > limit ? flat.slice(0, limit).trimEnd() + "..." : flat;
}
