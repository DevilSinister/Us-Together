import { describe, expect, it } from "vitest";
import { matchesUploadAllocation } from "./upload-allocation";
import { mediaRequest } from "./schema";

describe("idempotent allocation authorization", () => {
  const input = { mime: "image/png", size: 100, caption: "" };
  const row = { created_by: "uploader", mime_type: "image/png", size_bytes: 100, caption: "" };
  it("reuses only the authenticated uploader's identical file description", () => {
    expect(matchesUploadAllocation(row, "uploader", input)).toBe(true);
    expect(matchesUploadAllocation(row, "partner", input)).toBe(false);
    for (const change of [{ mime: "video/mp4" }, { size: 101 }, { caption: "different" }]) expect(matchesUploadAllocation(row, "uploader", { ...input, ...change })).toBe(false);
  });
  it("validates request IDs while retaining the older prepare contract", () => {
    const value = { operation: "prepare", memoryId: "c4998766-21ad-4dfd-8d7b-a6371346afea", filename: "fixture.png", ...input };
    expect(mediaRequest.safeParse(value).success).toBe(true);
    expect(mediaRequest.safeParse({ ...value, id: crypto.randomUUID() }).success).toBe(true);
    expect(mediaRequest.safeParse({ ...value, id: "not-a-uuid" }).success).toBe(false);
  });
});
