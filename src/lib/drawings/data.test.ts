import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeCursor } from "@/lib/pagination/cursor";

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

let contextKind: "database" | "preview" = "database";
let coupleId: string | null = "couple-1";
vi.mock("@/lib/couple/context", () => ({
  coupleContext: vi.fn(async () => contextKind === "preview"
    ? { kind: "preview" }
    : { kind: "database", db: { from: (table: string) => chain(table) }, userId: "me", coupleId }),
  partnerName: vi.fn(async () => "Maya"),
}));

const { loadDrawing, loadDrawings, loadDrawingWorkspace } = await import("./data");

const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, author: string) => ({
  id: uuid(n), author_id: author, recipient_id: author === "me" ? "partner" : "me",
  sent_at: `2026-09-${String(30 - (n % 28)).padStart(2, "0")}T10:00:00+00:00`,
});

beforeEach(() => { calls.length = 0; queue.clear(); contextKind = "database"; coupleId = "couple-1"; });

describe("loadDrawings", () => {
  it("pages by 25 and looks up read state only for received drawings on the page", async () => {
    const rows = Array.from({ length: 26 }, (_, i) => row(i + 1, i % 3 ? "partner" : "me"));
    respond("drawing_notes", { data: rows, error: null });
    respond("drawing_reads", { data: [{ drawing_id: uuid(2) }], error: null });
    const view = await loadDrawings();
    expect(view.notes).toHaveLength(25);
    expect(view.partner).toBe("Maya");
    expect(decodeCursor(view.next ?? undefined)).toEqual({ time: rows[24].sent_at, id: rows[24].id });
    const scope = of("drawing_reads", "in");
    expect(scope).toHaveLength(1);
    expect(scope[0].args).toEqual(["drawing_id", rows.slice(0, 25).filter((r) => r.author_id === "partner").map((r) => r.id)]);
    expect(view.notes.find((n) => n.id === uuid(1))?.read).toBe(true);
    expect(view.notes.find((n) => n.id === uuid(2))?.read).toBe(true);
    expect(view.notes.find((n) => n.id === uuid(3))?.read).toBe(false);
  });
  it("skips the read lookup when nothing on the page was received", async () => {
    respond("drawing_notes", { data: [row(1, "me")], error: null });
    const view = await loadDrawings();
    expect(view.notes[0].read).toBe(true);
    expect(calls.some((call) => call.table === "drawing_reads")).toBe(false);
  });
  it("reports an honest error instead of an empty history", async () => {
    respond("drawing_notes", { data: null, error: { code: "42501" } });
    const view = await loadDrawings();
    expect(view.error).toBeTruthy();
    expect(view.paired).toBe(true);
  });
});

describe("loadDrawing", () => {
  it("marks a received drawing read with an insert-or-ignore upsert and finds neighbours", async () => {
    respond("drawing_notes", { data: row(5, "partner"), error: null }, { data: { id: uuid(6) }, error: null }, { data: null, error: null });
    respond("drawing_reads", { data: null, error: null });
    const note = await loadDrawing(uuid(5));
    expect(note?.mine).toBe(false);
    expect(note?.older).toBe(uuid(6));
    expect(note?.newer).toBeNull();
    const upsert = of("drawing_reads", "upsert");
    expect(upsert).toHaveLength(1);
    expect(upsert[0].args).toEqual([{ drawing_id: uuid(5), user_id: "me" }, { onConflict: "drawing_id,user_id", ignoreDuplicates: true }]);
  });
  it("never writes read state for the author", async () => {
    respond("drawing_notes", { data: row(9, "me"), error: null });
    const note = await loadDrawing(uuid(9));
    expect(note?.mine).toBe(true);
    expect(of("drawing_reads", "upsert")).toHaveLength(0);
  });
});

describe("loadDrawingWorkspace", () => {
  it("distinguishes preview, unpaired and paired", async () => {
    contextKind = "preview";
    expect(await loadDrawingWorkspace()).toEqual({ state: "preview", partner: null });
    contextKind = "database"; coupleId = null;
    expect(await loadDrawingWorkspace()).toEqual({ state: "unpaired", partner: null });
    coupleId = "couple-1";
    expect(await loadDrawingWorkspace()).toEqual({ state: "paired", partner: "Maya" });
  });
});
