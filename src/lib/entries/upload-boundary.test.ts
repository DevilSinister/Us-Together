import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryMediaAction } from "@/app/actions/memories";
import { planContext } from "@/lib/plans/data";
vi.mock("@/lib/plans/data", () => ({ planContext: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentIdentity: vi.fn(async () => ({ kind: "supabase", userId: "c4998766-21ad-4dfd-8d7b-a6371346afea" })) }));

const me = "c4998766-21ad-4dfd-8d7b-a6371346afea", partner = "0d8fa4f8-ef6f-49f5-a5ae-f1723b0de372";
const input = { operation: "prepare", id: crypto.randomUUID(), memoryId: crypto.randomUUID(), mime: "image/png", size: 100, filename: "fixture.png", expectedUserId: me };
const invoke = vi.fn();
const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: input.memoryId }, error: null }) }) }) }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(planContext).mockResolvedValue({ kind: "database", paired: true, userId: me, db: { from, functions: { invoke } } } as unknown as Awaited<ReturnType<typeof planContext>>);
});
describe("upload account and retry boundary", () => {
  it("halts a stale queue after the browser switches to a different signed-in person", async () => {
    const result = await memoryMediaAction({ ...input, expectedUserId: partner });
    expect(result).toMatchObject({ status: 403, retryable: false });
    expect(from).not.toHaveBeenCalled(); expect(invoke).not.toHaveBeenCalled();
  });
  it("forwards a stable request ID but strips caller-supplied ownership", async () => {
    invoke.mockResolvedValue({ data: { id: input.id, path: "private/original", uploaded: false }, error: null });
    expect(await memoryMediaAction({ ...input, created_by: partner, couple_id: partner })).toMatchObject({ id: input.id });
    const body = invoke.mock.calls[0][1].body;
    expect(body.id).toBe(input.id); expect(body.created_by).toBeUndefined(); expect(body.couple_id).toBeUndefined(); expect(body.expectedUserId).toBeUndefined();
  });
  it("retains recoverable processing conflicts and permanent authorization errors", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: Response.json({ error: "Still processing", retryable: true }, { status: 409 }) } });
    expect(await memoryMediaAction(input)).toMatchObject({ status: 409, retryable: true });
    invoke.mockResolvedValueOnce({ data: null, error: { context: Response.json({ error: "Not allowed" }, { status: 403 }) } });
    expect(await memoryMediaAction(input)).toMatchObject({ status: 403, retryable: false });
  });
});
