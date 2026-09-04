"use server";
import { revalidatePath } from "next/cache";
import { coupleContext } from "@/lib/couple/context";
import { noteInput } from "@/lib/notes/schema";

type Result = { ok?: true; id?: string; error?: string; fields?: Record<string, string[]> };

function invalid(error: unknown): Result {
  if (error && typeof error === "object" && "issues" in error) {
    const fields: Record<string, string[]> = {};
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const key = String(issue.path[0] ?? "form");
      fields[key] = [...(fields[key] ?? []), issue.message];
    }
    return { error: "Check the highlighted fields.", fields };
  }
  return { error: "We could not save that. Try again." };
}

/**
 * Only the author writes a note. Type is part of the payload so switching a note
 * between shared and private is an ordinary authored edit, and the database trigger
 * adds or withdraws the partner notification to match.
 */
export async function saveNote(input: unknown): Promise<Result> {
  let parsed;
  try {
    parsed = noteInput.parse(input);
  } catch (error) {
    return invalid(error);
  }
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return { error: "Notes open with a connected account." };
    if (!context.coupleId) return { error: "Connect your partner to start writing notes." };
    const row = { type: parsed.type, title: parsed.title, body: parsed.body };
    if (parsed.id) {
      const { data, error } = await context.db.from("notes").update(row).eq("id", parsed.id).select("id").maybeSingle();
      if (error || !data) return { error: "Only the author can change this note." };
      revalidatePath("/notes");
      revalidatePath("/notes/" + parsed.id);
      return { ok: true, id: parsed.id };
    }
    const { data, error } = await context.db
      .from("notes")
      .insert({ ...row, couple_id: context.coupleId, author_id: context.userId })
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "We could not save that note. Try again." };
    revalidatePath("/notes");
    return { ok: true, id: data.id };
  } catch {
    return { error: "Connection interrupted. Your note is unchanged." };
  }
}

export async function deleteNote(id: string): Promise<Result> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return { error: "Notes open with a connected account." };
    const { data, error } = await context.db.from("notes").delete().eq("id", id).select("id").maybeSingle();
    if (error || !data) return { error: "Only the author can delete this note." };
    revalidatePath("/notes");
    return { ok: true };
  } catch {
    return { error: "Connection interrupted. Try again." };
  }
}
