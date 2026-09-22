import { describe, it, expect } from "vitest";
import { dayKey, dayLabel, clockLabel, fullLabel, groupByDay, resolveTimeZone, todayKey } from "./day";

describe("comment day keys", () => {
  it("places an instant on the reader's calendar day, not UTC's", () => {
    // 23:30 UTC is already the next morning in Karachi (+05:00).
    expect(dayKey("2026-09-17T23:30:00Z", "UTC")).toBe("2026-09-17");
    expect(dayKey("2026-09-17T23:30:00Z", "Asia/Karachi")).toBe("2026-09-18");
    // And the same instant is still the previous evening in New York.
    expect(dayKey("2026-09-18T02:30:00Z", "America/New_York")).toBe("2026-09-17");
  });

  it("survives a DST transition, where a calendar day is not 24 hours", () => {
    // US DST ends 2026-11-01; 05:30 UTC is 01:30 EDT, 06:30 UTC is 01:30 EST.
    expect(dayKey("2026-11-01T05:30:00Z", "America/New_York")).toBe("2026-11-01");
    expect(dayKey("2026-11-01T06:30:00Z", "America/New_York")).toBe("2026-11-01");
    // The day either side of the transition still resolves correctly.
    expect(dayKey("2026-11-01T03:59:00Z", "America/New_York")).toBe("2026-10-31");
    expect(dayKey("2026-11-02T04:01:00Z", "America/New_York")).toBe("2026-11-01");
  });

  it("reads today from a supplied clock", () => {
    expect(todayKey("Asia/Karachi", new Date("2026-09-17T20:00:00Z"))).toBe("2026-09-18");
  });

  it("falls back to the host zone only when no preference is given", () => {
    expect(resolveTimeZone("Asia/Karachi")).toBe("Asia/Karachi");
    expect(resolveTimeZone(null)).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  });
});

describe("day separator labels", () => {
  const today = "2026-09-17";

  it("names today and yesterday", () => {
    expect(dayLabel("2026-09-17", today)).toBe("Today");
    expect(dayLabel("2026-09-16", today)).toBe("Yesterday");
  });

  it("uses a weekday name inside the last week and a full date beyond it", () => {
    expect(dayLabel("2026-09-12", today)).toBe("Saturday"); // 5 days back
    expect(dayLabel("2026-09-11", today)).toBe("Friday"); // 6 days back, the last day inside the window
    expect(dayLabel("2026-09-10", today)).toBe("September 10, 2026"); // 7 days back, past it
  });

  it("gives a future day its full date rather than a weekday that reads as past", () => {
    expect(dayLabel("2026-09-18", today)).toBe("September 18, 2026");
  });

  it("counts calendar days across a DST boundary, not elapsed hours", () => {
    // 2026-11-01 is a 25-hour day in New York; the day before it is still "Yesterday".
    expect(dayLabel("2026-11-01", "2026-11-02")).toBe("Yesterday");
    expect(dayLabel("2026-10-31", "2026-11-02")).toBe("Saturday");
  });
});

describe("bubble timestamps", () => {
  it("shows a short clock in the reader's zone", () => {
    expect(clockLabel("2026-09-17T09:14:00Z", "UTC")).toBe("9:14 AM");
    expect(clockLabel("2026-09-17T09:14:00Z", "Asia/Karachi")).toBe("2:14 PM");
  });

  it("gives assistive technology the date as well as the time", () => {
    expect(fullLabel("2026-09-17T09:14:00Z", "UTC")).toContain("September 17, 2026");
    expect(fullLabel("2026-09-17T09:14:00Z", "UTC")).toContain("9:14 AM");
  });
});

describe("grouping a thread by day", () => {
  const at = (created_at: string) => ({ created_at });

  it("returns one group per day, in order", () => {
    const groups = groupByDay(
      [at("2026-09-16T10:00:00Z"), at("2026-09-16T18:00:00Z"), at("2026-09-17T08:00:00Z")],
      "UTC",
    );
    expect(groups.map(g => g.key)).toEqual(["2026-09-16", "2026-09-17"]);
    expect(groups.map(g => g.items.length)).toEqual([2, 1]);
  });

  it("regroups when the reader's zone moves a comment across midnight", () => {
    const items = [at("2026-09-17T18:00:00Z"), at("2026-09-17T20:00:00Z")];
    expect(groupByDay(items, "UTC").map(g => g.key)).toEqual(["2026-09-17"]);
    // In Karachi the second comment is already the 18th.
    expect(groupByDay(items, "Asia/Karachi").map(g => g.key)).toEqual(["2026-09-17", "2026-09-18"]);
  });

  it("handles an empty thread and a single comment", () => {
    expect(groupByDay([], "UTC")).toEqual([]);
    expect(groupByDay([at("2026-09-17T08:00:00Z")], "UTC")).toHaveLength(1);
  });
});
