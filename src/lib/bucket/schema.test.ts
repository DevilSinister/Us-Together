import { describe, expect, it } from "vitest";
import { bucketFilterSchema, bucketItemSchema, bucketMutationSchema, dateOnly, moveSubtask, subtaskProgress } from "./schema";
const item = { listId: "10000000-0000-4000-8000-000000000001", title: "A little adventure", description: "", category: "Travel", priority: "dream", status: "idea", cost: "25.50", currency: "USD", targetDate: "2028-02-29", location: "" };
describe("bucket boundaries", () => {
  it("normalizes optional text and validates exact money pairs", () => { expect(bucketItemSchema.parse(item).description).toBeNull(); expect(bucketItemSchema.safeParse({ ...item, currency: "" }).success).toBe(false); expect(bucketItemSchema.safeParse({ ...item, cost: "1e6" }).success).toBe(false); });
  it("rejects impossible dates, unknown states and priorities", () => { expect(dateOnly.safeParse("2027-02-29").success).toBe(false); expect(bucketItemSchema.safeParse({ ...item, status: "done" }).success).toBe(false); expect(bucketItemSchema.safeParse({ ...item, priority: "urgent" }).success).toBe(false); });
  it("validates lookup cursors and destructive confirmation", () => { expect(bucketFilterSchema.safeParse({ listId: "", status: "", priority: "", category: "", before: "bad" }).success).toBe(false); expect(bucketMutationSchema.safeParse({ operation: "deleteItem", id: item.listId, version: 0, confirmation: "yes" }).success).toBe(false); });
  it("rejects stale-version shapes and empty labels at the item boundary", () => { expect(bucketMutationSchema.safeParse({ operation: "completeItem", id: item.listId, version: -1 }).success).toBe(false); expect(bucketItemSchema.safeParse({ ...item, title: "  " }).success).toBe(false); });
});
describe("steps", () => {
  it("calculates zero, partial, and complete progress", () => { expect(subtaskProgress([])).toEqual({ completed: 0, total: 0, percent: 0 }); expect(subtaskProgress([{ is_completed: true }, { is_completed: false }]).percent).toBe(50); expect(subtaskProgress([{ is_completed: true }]).percent).toBe(100); });
  it("moves one step without losing or mutating other IDs", () => { const ids = ["a", "b", "c"]; expect(moveSubtask(ids, "b", -1)).toEqual(["b", "a", "c"]); expect(moveSubtask(ids, "b", 1)).toEqual(["a", "c", "b"]); expect(ids).toEqual(["a", "b", "c"]); });
  it("keeps boundary and missing steps stable", () => { expect(moveSubtask(["a", "b"], "a", -1)).toEqual(["a", "b"]); expect(moveSubtask(["a", "b"], "b", 1)).toEqual(["a", "b"]); expect(moveSubtask(["a"], "x", 1)).toEqual(["a"]); });
});
