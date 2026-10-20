import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { memoryMediaAction } from "@/app/actions/memories";
vi.mock("@/app/actions/memories", () => ({ memoryMediaAction: vi.fn() }));
const request = (body: string, origin = "https://example.test") => new Request("https://example.test/api/entry-uploads", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body });
beforeEach(() => vi.clearAllMocks());
describe("upload mutation boundary", () => {
  it("rejects cross-origin and missing-origin requests before running a mutation", async () => {
    expect((await POST(request("{}", "https://foreign.test"))).status).toBe(403);
    expect((await POST(request("{}", ""))).status).toBe(403);
    expect(memoryMediaAction).not.toHaveBeenCalled();
  });
  it("rejects oversized and malformed requests before running a mutation", async () => {
    expect((await POST(request("x".repeat(4097)))).status).toBe(400);
    expect((await POST(request("{"))).status).toBe(400);
    expect(memoryMediaAction).not.toHaveBeenCalled();
  });
  it("uses the authorized service's error category and forbids caching", async () => {
    vi.mocked(memoryMediaAction).mockResolvedValue({ error: "Still processing", status: 409, retryable: true });
    const response = await POST(request('{"operation":"finalize"}'));
    expect(response.status).toBe(409); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ retryable: true });
  });
});
