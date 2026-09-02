import { describe, expect, it } from "vitest";
import { isValidTimeZone, moneyToMinorUnits, planSchema, zonedLocalToUtc } from "./schema";

describe("dream domain validation", () => {
  it("validates plan money as a complete pair", () => {
    expect(planSchema.safeParse({ title: "Dinner", description: "", type: "date", startsAt: "2026-09-05T18:00", endsAt: "", timezone: "Asia/Karachi", location: "", budget: "25", currency: "" }).success).toBe(false);
  });

  it("converts exact money without floating point arithmetic", () => {
    expect(moneyToMinorUnits("12.05")).toBe(1205);
  });

  it("recognizes IANA zones and resolves local time", () => {
    expect(isValidTimeZone("Asia/Karachi")).toBe(true);
    expect(zonedLocalToUtc("2026-09-05T18:00", "Asia/Karachi")).toBe("2026-09-05T13:00:00.000Z");
  });

  it("rejects a daylight-saving gap", () => {
    expect(() => zonedLocalToUtc("2026-03-29T01:30", "Europe/London")).toThrow();
  });
});
