import { describe, expect, it } from "vitest";
import { datePlate, daysUntil, planLead, privacySafeCandidates, relationshipDayCount, selectRelevantCandidate, type DashboardCandidate } from "./model";

describe("next plan on Home", () => {
  it("counts calendar days in the viewer's zone, not 24-hour blocks", () => {
    // 03:00 on 12 November in Karachi, 17:00 on 11 November in New York.
    const now = new Date("2026-11-11T22:00:00.000Z");
    expect(daysUntil("2026-11-11T23:00:00.000Z", "Asia/Karachi", now)).toBe(0);
    // Twenty-two hours away, but on the next calendar day there.
    expect(daysUntil("2026-11-12T20:00:00.000Z", "Asia/Karachi", now)).toBe(1);
    expect(daysUntil("2026-11-14T14:30:00.000Z", "America/New_York", now)).toBe(3);
    expect(daysUntil("not a date", "UTC", now)).toBeNull();
  });

  it("words the countdown for people", () => {
    expect(planLead(0)).toBe("Coming up today");
    expect(planLead(1)).toBe("Coming up tomorrow");
    expect(planLead(3)).toBe("Coming up in 3 days");
    expect(planLead(null)).toBe("Coming up");
  });

  it("prints the date tile in the viewer's zone", () => {
    expect(datePlate("2026-11-14T23:30:00.000Z", "UTC")).toEqual({ month: "NOV", day: "14" });
    expect(datePlate("2026-11-14T23:30:00.000Z", "Asia/Karachi")).toEqual({ month: "NOV", day: "15" });
  });
});

describe("dashboard projection", () => {
  it("returns an honest empty projection", () => {
    expect(selectRelevantCandidate([], "plan")).toBeNull();
  });

  it("counts relationship calendar days in the viewer timezone", () => {
    const now = new Date("2026-09-01T01:00:00.000Z");
    expect(relationshipDayCount("2026-08-31", "Asia/Karachi", now)).toBe(1);
    expect(relationshipDayCount("2026-08-31", "America/Los_Angeles", now)).toBe(0);
  });

  it("selects the newest populated shared item with stable ID ordering", () => {
    const items: DashboardCandidate[] = [
      { id: "a", kind: "memory", visibility: "shared", occurredAt: "2026-08-20" },
      { id: "b", kind: "memory", visibility: "shared", occurredAt: "2026-08-20" },
    ];
    expect(selectRelevantCandidate(items, "memory")?.id).toBe("b");
  });

  it("omits private and secret candidates from mixed-privacy couples", () => {
    const items: DashboardCandidate[] = [
      { id: "shared", kind: "milestone", visibility: "shared", occurredAt: "2026-08-01" },
      { id: "private", kind: "memory", visibility: "private", occurredAt: "2026-09-01" },
      { id: "secret", kind: "plan", visibility: "secret", occurredAt: "2026-09-02" },
    ];
    expect(privacySafeCandidates(items).map((item) => item.id)).toEqual(["shared"]);
    expect(selectRelevantCandidate(items, "plan")).toBeNull();
  });
});
