import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, groupByYear, type StoryEntry } from "./schema";

const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

const entry = (occurred_on: string, entryId: string): StoryEntry => ({
  kind: "memory",
  id: entryId,
  couple_id: "33333333-3333-4333-8333-333333333333",
  occurred_on,
  title: "A day",
  location: null,
  source_bucket_item_id: null,
  source_plan_id: null,
});

describe("story cursor", () => {
  it("round-trips a valid cursor", () => {
    expect(decodeCursor(encodeCursor({ occurredOn: "2024-08-14", id }))).toEqual({ occurredOn: "2024-08-14", id });
  });

  it("rejects anything that is not an exact date and uuid", () => {
    // The halves are interpolated into a PostgREST filter, so a loose cursor is a
    // filter-injection surface rather than a cosmetic problem.
    expect(decodeCursor("2024-08-14,id.gt.0|" + id)).toBeNull();
    expect(decodeCursor("2024-8-14|" + id)).toBeNull();
    expect(decodeCursor("2024-13-40|" + id)).toBeNull();
    expect(decodeCursor("2024-08-14|not-a-uuid")).toBeNull();
    expect(decodeCursor("2024-08-14|" + id + "|extra")).toBeNull();
    expect(decodeCursor("2024-08-14")).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });
});

describe("groupByYear", () => {
  it("groups consecutive entries and preserves order", () => {
    const groups = groupByYear([entry("2024-08-14", id), entry("2024-01-02", other), entry("2023-12-31", id)]);
    expect(groups.map((group) => group.year)).toEqual(["2024", "2023"]);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].entries).toHaveLength(1);
  });

  it("returns nothing for an empty page", () => {
    expect(groupByYear([])).toEqual([]);
  });
});
