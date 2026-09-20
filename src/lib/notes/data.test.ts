import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeCursor } from "@/lib/pagination/cursor";

/**
 * A recording fake for the Supabase query builder. Every method logs its call and
 * returns the same thenable, so a test can assert *which* filters a loader applied
 * without a database.
 */
type Call = { table: string; method: string; args: unknown[] };
const calls: Call[] = [];
const queue = new Map<string, unknown[]>();
const respond = (table: string, ...values: unknown[]) => queue.set(table, values);
const nextResponse = (table: string) => {
  const pending = queue.get(table);
  return pending?.length ? pending.shift() : { data: null, error: null };
};
function chain(table: string) {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "or", "order", "limit", "maybeSingle", "upsert", "is", "neq"]) {
    query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query; };
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(nextResponse(table)).then(resolve, reject);
  return query;
}
const of = (table: string, method: string) => calls.filter((call) => call.table === table && call.method === method);

vi.mock("@/lib/couple/context", () => ({
  coupleContext: vi.fn(async () => ({ kind: "database", db: { from: (table: string) => chain(table) }, userId: "me", coupleId: "couple-1" })),
  partnerName: vi.fn(async () => "Maya"),
}));

const { loadNote, loadNotes } = await import("./data");

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, author: string) => ({
  id: uuid(n), type: "shared", title: "Note " + n, body: "Body", author_id: author,
  created_at: `2026-09-01T00:00:${String(n % 60).padStart(2, "0")}+00:00`,
  updated_at: `2026-09-${String(30 - (n % 28)).padStart(2, "0")}T10:00:00+00:00`,
});

beforeEach(() => { calls.length = 0; queue.clear(); });

describe("loadNotes", () => {
  it("returns one page of 25, a cursor for the 26th, and scopes the read lookup to this page's partner notes", async () => {
    const rows = Array.from({ length: 26 }, (_, i) => row(i + 1, i % 2 ? "partner" : "me"));
    respond("notes", { data: rows, error: null });
    respond("note_reads", { data: [{ note_id: uuid(2) }], error: null });
    const view = await loadNotes();
    expect(view.paired).toBe(true);
    expect(view.partner).toBe("Maya");
    expect(view.notes).toHaveLength(25);
    expect(decodeCursor(view.next ?? undefined)).toEqual({ time: rows[24].updated_at, id: rows[24].id });

    const scope = of("note_reads", "in");
    expect(scope).toHaveLength(1);
    const expected = rows.slice(0, 25).filter((r) => r.author_id === "partner").map((r) => r.id);
    expect(scope[0].args).toEqual(["note_id", expected]);
    expect(of("note_reads", "limit")).toHaveLength(0);
    expect(of("notes", "limit")[0].args).toEqual([26]);

    expect(view.notes.find((n) => n.id === uuid(2))?.read).toBe(true);
    expect(view.notes.find((n) => n.id === uuid(4))?.read).toBe(false);
    expect(view.notes.find((n) => n.id === uuid(1))?.read).toBe(true);
  });
  it("does not query read state when every note on the page is the viewer's own", async () => {
    respond("notes", { data: [row(1, "me"), row(2, "me")], error: null });
    const view = await loadNotes();
    expect(view.notes).toHaveLength(2);
    expect(view.next).toBeNull();
    expect(calls.some((call) => call.table === "note_reads")).toBe(false);
  });
  it("applies a valid cursor as a keyset filter and ignores a malformed one", async () => {
    respond("notes", { data: [], error: null });
    await loadNotes(Buffer.from("2026-09-10T10:00:00+00:00|" + uuid(9)).toString("base64url"));
    expect(of("notes", "or")[0].args[0]).toBe(`updated_at.lt.2026-09-10T10:00:00+00:00,and(updated_at.eq.2026-09-10T10:00:00+00:00,id.lt.${uuid(9)})`);
    calls.length = 0;
    respond("notes", { data: [], error: null });
    await loadNotes("garbage");
    expect(of("notes", "or")).toHaveLength(0);
  });
});

describe("loadNote", () => {
  it("records a partner note as read with an insert-or-ignore upsert", async () => {
    respond("notes", { data: row(7, "partner"), error: null });
    respond("note_reads", { data: null, error: null });
    const note = await loadNote(uuid(7));
    expect(note?.mine).toBe(false);
    expect(note?.partner).toBe("Maya");
    const upsert = of("note_reads", "upsert");
    expect(upsert).toHaveLength(1);
    expect(upsert[0].args[0]).toEqual({ note_id: uuid(7), user_id: "me" });
    expect(upsert[0].args[1]).toEqual({ onConflict: "note_id,user_id", ignoreDuplicates: true });
  });
  it("never writes read state for the viewer's own note", async () => {
    respond("notes", { data: row(8, "me"), error: null });
    const note = await loadNote(uuid(8));
    expect(note?.mine).toBe(true);
    expect(of("note_reads", "upsert")).toHaveLength(0);
  });
});
