import { describe, expect, it } from "vitest";
import { chapterLabel, decodeCursor, encodeCursor, groupByYear, storyExcerpt, storySummary, type StoryEntry } from "./schema";

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

describe("story summary", () => {
  it("reads as one sentence and leaves out what is not there yet", () => {
    expect(storySummary({ memory: 12, milestone: 4, plan: 0, bucket: 2 })).toBe("12 memories, 4 moments and 2 dreams lived");
    expect(storySummary({ memory: 1, milestone: 0, plan: 1, bucket: 0 })).toBe("1 memory and 1 plan kept");
    expect(storySummary({ memory: 0, milestone: 1, plan: 0, bucket: 0 })).toBe("1 moment");
    expect(storySummary({ memory: 0, milestone: 0, plan: 0, bucket: 0 })).toBeNull();
  });
});

describe("chapters", () => {
  it("counts calendar years from the year the story began", () => {
    expect(chapterLabel("2022", "2022-08-14")).toBe("Chapter one");
    expect(chapterLabel("2024", "2022-08-14")).toBe("Chapter three");
    expect(chapterLabel("2050", "2022-08-14")).toBe("Chapter 29");
  });

  it("gives no chapter to a year before the start, or without a start", () => {
    expect(chapterLabel("2021", "2022-08-14")).toBeNull();
    expect(chapterLabel("2024", null)).toBeNull();
    expect(chapterLabel("2024", "not a date")).toBeNull();
  });
});

describe("story excerpts", () => {
  it("keeps a short story whole and flattens its line breaks", () => {
    expect(storyExcerpt("We walked\n\nall night.")).toBe("We walked all night.");
    expect(storyExcerpt("   ")).toBeNull();
    expect(storyExcerpt(null)).toBeNull();
  });

  it("cuts a long story at a word and marks the cut", () => {
    const long = "word ".repeat(80);
    const excerpt = storyExcerpt(long)!;
    expect(excerpt.endsWith("word…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(181);
  });
});
