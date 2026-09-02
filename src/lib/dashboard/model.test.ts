import { describe, expect, it } from "vitest";
import { privacySafeCandidates, relationshipDayCount, selectRelevantCandidate, type DashboardCandidate } from "./model";

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
