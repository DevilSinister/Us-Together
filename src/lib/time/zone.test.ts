import { describe, expect, it } from "vitest";
import { reanchorWallClock, wallClock } from "./zone";

describe("wallClock", () => {
  it("reads an instant on the given clock", () => {
    expect(wallClock("2026-10-18T14:00:00.000Z", "Asia/Karachi")).toBe("2026-10-18T19:00");
    expect(wallClock("2026-10-18T14:00:00.000Z", "UTC")).toBe("2026-10-18T14:00");
  });
});

describe("reanchorWallClock", () => {
  it("keeps the typed time when a plan was saved under UTC by mistake", () => {
    // Typed as 7:00 PM, stored as 19:00Z; in Karachi that should be 14:00Z.
    expect(reanchorWallClock("2026-10-18T19:00:00.000Z", "UTC", "Asia/Karachi")).toBe("2026-10-18T14:00:00.000Z");
  });

  it("crosses a date line without losing the day", () => {
    expect(reanchorWallClock("2026-10-18T00:30:00.000Z", "UTC", "America/New_York")).toBe("2026-10-18T04:30:00.000Z");
  });

  it("keeps the instant when the wall clock does not exist in the new zone", () => {
    // 02:30 on 8 March 2026 is skipped in New York.
    expect(reanchorWallClock("2026-03-08T02:30:00.000Z", "UTC", "America/New_York")).toBe("2026-03-08T02:30:00.000Z");
  });

  it("is a no-op between identical zones", () => {
    expect(reanchorWallClock("2026-10-18T19:00:00.000Z", "UTC", "UTC")).toBe("2026-10-18T19:00:00.000Z");
  });
});
