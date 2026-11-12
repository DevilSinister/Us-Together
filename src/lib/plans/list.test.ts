import { describe, expect, it } from "vitest";
import { dateTile, planLine, planPhase, planWhen, reminderLabel, reminderWhen, whenNext } from "./list";

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

describe("plan page wording", () => {
  const now = new Date("2026-11-12T10:00:00.000Z");
  it("places a plan against the clock in local days", () => {
    expect(planPhase(plan("2026-11-14T14:30:00.000Z"), tz, now)).toBe("ahead");
    expect(planPhase(plan("2026-11-12T05:00:00.000Z", "2026-11-12T15:00:00.000Z"), tz, now)).toBe("now");
    expect(planPhase(plan("2026-10-18T08:00:00.000Z"), tz, now)).toBe("past");
    expect(planPhase(plan("2026-11-11T05:00:00.000Z", "2026-11-13T05:00:00.000Z"), tz, now)).toBe("now");
  });
  it("spells out when, with a same-day range, several days, and a year only when it differs", () => {
    expect(planWhen(plan("2026-11-14T14:30:00.000Z"), tz, now)).toBe("Saturday 14 November · 7:30 PM");
    expect(planWhen(plan("2026-11-14T14:30:00.000Z", "2026-11-14T17:00:00.000Z"), tz, now)).toBe("Saturday 14 November · 7:30 – 10:00 PM");
    expect(planWhen(plan("2026-12-12T05:00:00.000Z", "2026-12-14T12:00:00.000Z"), tz, now)).toBe("Saturday 12 December, 10:00 AM – Monday 14 December, 5:00 PM");
    expect(planWhen(plan("2027-02-14T11:00:00.000Z"), tz, now)).toBe("Sunday 14 February 2027 · 4:00 PM");
  });
  it("names reminders and when they fire", () => {
    expect(planWhen(plan("2026-11-14T05:30:00.000Z", "2026-11-14T09:00:00.000Z"), tz, now)).toBe("Saturday 14 November · 10:30 AM – 2:00 PM");
    expect(reminderLabel(1440)).toBe("The day before");
    expect(reminderLabel(120)).toBe("2 hours before");
    expect(reminderWhen("2026-11-13T13:00:00.000Z", tz, now)).toBe("Friday · 6:00 PM");
    expect(reminderWhen("2026-12-11T05:00:00.000Z", tz, now)).toBe("Fri 11 Dec · 10:00 AM");
  });
});
