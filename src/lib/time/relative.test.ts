import { describe, expect, it } from "vitest";
import { absoluteTime, relativeTime } from "./relative";

const now = Date.parse("2026-09-20T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("relativeTime", () => {
  it("reads as just now under a minute, including clock skew into the future", () => {
    expect(relativeTime(ago(0), now)).toBe("just now");
    expect(relativeTime(ago(59_000), now)).toBe("just now");
    expect(relativeTime(ago(-30_000), now)).toBe("just now");
  });
  it("counts minutes and hours", () => {
    expect(relativeTime(ago(60_000), now)).toBe("1 min ago");
    expect(relativeTime(ago(59 * 60_000), now)).toBe("59 min ago");
    expect(relativeTime(ago(60 * 60_000), now)).toBe("1 h ago");
    expect(relativeTime(ago(23 * 3_600_000 + 59_000), now)).toBe("23 h ago");
  });
  it("says yesterday for the second day, then names the weekday for a week", () => {
    expect(relativeTime(ago(24 * 3_600_000), now)).toBe("yesterday");
    expect(relativeTime(ago(47 * 3_600_000), now)).toBe("yesterday");
    const twoDays = ago(2 * 24 * 3_600_000);
    expect(relativeTime(twoDays, now)).toBe(new Intl.DateTimeFormat("en", { weekday: "long" }).format(Date.parse(twoDays)));
  });
  it("falls back to a medium date after seven days", () => {
    const old = ago(7 * 24 * 3_600_000);
    expect(relativeTime(old, now)).toBe(new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(Date.parse(old)));
  });
  it("returns an empty string for an unparseable instant", () => {
    expect(relativeTime("not a date", now)).toBe("");
    expect(absoluteTime("not a date")).toBe("");
  });
});
