import { describe, expect, it } from "vitest";
import { dateTile, planLine, whenNext } from "./list";

const tz = "Asia/Karachi"; // UTC+5, no daylight saving
const plan = (starts_at: string, ends_at: string | null = null, location: string | null = "Lakeside") => ({ starts_at, ends_at, location });

describe("plan list formatting", () => {
  it("reads the tile in the couple's zone, not UTC", () => {
    expect(dateTile("2026-11-13T21:00:00.000Z", tz)).toEqual({ month: "NOV", day: "14", date: "2026-11-14" });
  });
  it("says weekday, time and place, and an end day for a plan over several days", () => {
    expect(planLine(plan("2026-11-14T14:30:00.000Z"), tz)).toBe("Sat · 7:30 PM · Lakeside");
    expect(planLine(plan("2026-12-12T05:00:00.000Z", "2026-12-14T12:00:00.000Z", "Nathia Gali"), tz)).toBe("Sat · 10:00 AM · until Mon 14 Dec · Nathia Gali");
    expect(planLine(plan("2026-11-14T14:30:00.000Z", null, null), tz, false)).toBe("Sat");
  });
  it("counts days to the next plan in local days", () => {
    const now = new Date("2026-11-12T10:00:00.000Z");
    expect(whenNext(plan("2026-11-12T15:00:00.000Z"), tz, now)).toBe("today");
    expect(whenNext(plan("2026-11-13T15:00:00.000Z"), tz, now)).toBe("tomorrow");
    expect(whenNext(plan("2026-11-14T15:00:00.000Z"), tz, now)).toBe("in 2 days");
    expect(whenNext(plan("2026-12-12T05:00:00.000Z"), tz, now)).toBe("in 4 weeks");
    expect(whenNext(plan("2026-11-11T05:00:00.000Z", "2026-11-13T05:00:00.000Z"), tz, now)).toBe("happening now");
  });
});
