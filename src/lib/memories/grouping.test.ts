import { describe, it, expect } from "vitest";
import { groupByMonth } from "./grouping";

const on = (memory_date: string) => ({ memory_date });

describe("memories by month", () => {
  it("buckets consecutive days of the same month together", () => {
    const groups = groupByMonth([on("2026-09-17"), on("2026-09-02"), on("2026-08-30")]);
    expect(groups.map(g => g.key)).toEqual(["2026-09", "2026-08"]);
    expect(groups.map(g => g.memories.length)).toEqual([2, 1]);
  });

  it("labels each bucket with its month and year", () => {
    expect(groupByMonth([on("2026-09-17")])[0].label).toBe("September 2026");
  });

  it("splits across a year boundary", () => {
    const groups = groupByMonth([on("2027-01-04"), on("2026-12-28")]);
    expect(groups.map(g => g.label)).toEqual(["January 2027", "December 2026"]);
  });

  it("reads the month from the date string, never from a local clock", () => {
    // A January 1st memory must not drift into December for a reader west of UTC.
    expect(groupByMonth([on("2026-01-01")])[0].key).toBe("2026-01");
    expect(groupByMonth([on("2026-01-01")])[0].label).toBe("January 2026");
  });

  it("handles an empty list and a single memory", () => {
    expect(groupByMonth([])).toEqual([]);
    expect(groupByMonth([on("2026-09-17")])).toHaveLength(1);
  });
});
