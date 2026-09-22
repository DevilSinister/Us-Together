import { describe, it, expect } from "vitest";
import { PENDING_PREFIX, isPending, optimisticComment, mergePending, dropPending } from "./comments";
import type { EntryComment } from "./types";

const saved = (id: string, body: string, mine = true): EntryComment =>
  ({ id, body, created_at: "2026-09-17T08:00:00Z", mine });

describe("optimistic comment", () => {
  it("matches the EntryComment shape and is marked pending and mine", () => {
    const c = optimisticComment("  hello  ", new Date("2026-09-17T08:00:00Z"), "k");
    expect(c).toEqual({
      id: PENDING_PREFIX + "k",
      body: "hello",
      created_at: "2026-09-17T08:00:00.000Z",
      mine: true,
    });
    expect(isPending(c.id)).toBe(true);
    expect(isPending("real-id")).toBe(false);
  });
});

describe("merging a server list with pending rows", () => {
  it("keeps a pending bubble the server has not returned yet", () => {
    const pending = optimisticComment("on its way", new Date(), "k");
    const merged = mergePending([saved("1", "earlier")], [saved("1", "earlier"), pending]);
    expect(merged.map(c => c.id)).toEqual(["1", PENDING_PREFIX + "k"]);
  });

  it("drops the pending bubble once the server list contains it", () => {
    const pending = optimisticComment("landed", new Date(), "k");
    const merged = mergePending([saved("1", "landed")], [pending]);
    expect(merged.map(c => c.id)).toEqual(["1"]);
  });

  it("matches on the trimmed body, so whitespace does not strand a bubble", () => {
    const pending = optimisticComment("  spaced  ", new Date(), "k");
    expect(mergePending([saved("1", "spaced")], [pending])).toHaveLength(1);
  });

  it("does not let the partner's identical text retire my pending bubble", () => {
    const pending = optimisticComment("same words", new Date(), "k");
    const merged = mergePending([saved("1", "same words", false)], [pending]);
    expect(merged.map(c => c.id)).toEqual(["1", PENDING_PREFIX + "k"]);
  });

  it("returns the server list itself when nothing is pending", () => {
    const server = [saved("1", "a"), saved("2", "b")];
    expect(mergePending(server, server)).toBe(server);
  });

  it("never carries a settled row over from the current list", () => {
    // A comment deleted elsewhere must disappear, not be resurrected.
    expect(mergePending([], [saved("1", "deleted elsewhere")])).toEqual([]);
  });
});

describe("dropping a pending row after a failed write", () => {
  it("removes only the named row", () => {
    const pending = optimisticComment("failed", new Date(), "k");
    const list = [saved("1", "kept"), pending];
    expect(dropPending(list, pending.id).map(c => c.id)).toEqual(["1"]);
    expect(dropPending(list, "missing")).toHaveLength(2);
  });
});
