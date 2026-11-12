import { describe, expect, it } from "vitest";
import { notificationHref, relativeWhen } from "./links";

const id = "00000000-0000-4000-8000-000000000501";

describe("notification links", () => {
  it("opens the target, or the section a deleted target left", () => {
    expect(notificationHref({ category: "note", target_type: "note", target_id: id })).toBe("/notes/" + id);
    expect(notificationHref({ category: "bucket", target_type: "bucket_list", target_id: id })).toBe("/bucket/lists/" + id);
    expect(notificationHref({ category: "drawing", target_type: null, target_id: null })).toBe("/drawings");
    expect(notificationHref({ category: "system", target_type: null, target_id: null })).toBe("/home");
  });
  it("never builds a path from an unknown type or a malformed id", () => {
    expect(notificationHref({ category: "note", target_type: "elsewhere", target_id: id })).toBe("/home");
    expect(notificationHref({ category: "note", target_type: "note", target_id: "../../admin" })).toBe("/home");
  });
});

describe("relative time", () => {
  const tz = "Asia/Karachi";
  const now = new Date("2026-11-13T10:00:00.000Z"); // 3 PM in Karachi
  it("counts minutes and hours today", () => {
    expect(relativeWhen("2026-11-13T09:51:00.000Z", now, tz)).toBe("9 minutes ago");
    expect(relativeWhen("2026-11-13T08:00:00.000Z", now, tz)).toBe("2 hours ago");
    expect(relativeWhen("2026-11-13T09:59:50.000Z", now, tz)).toBe("Just now");
  });
  it("names yesterday by the local day, then days, then the date", () => {
    expect(relativeWhen("2026-11-12T18:00:00.000Z", now, tz)).toBe("Yesterday");
    expect(relativeWhen("2026-11-10T10:00:00.000Z", now, tz)).toBe("3 days ago");
    expect(relativeWhen("2026-10-02T10:00:00.000Z", now, tz)).toBe("2 Oct");
    expect(relativeWhen("2025-10-02T10:00:00.000Z", now, tz)).toBe("2 Oct 2025");
  });
});
