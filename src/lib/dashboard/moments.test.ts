import { describe, expect, it } from "vitest";
import { momentKindLabel, tallyMomentMedia } from "./moments";

describe("moments list", () => {
  it("counts each moment's photographs and files and keeps its first photograph", () => {
    const tally = tallyMomentMedia([
      { id: "v1", milestone_id: "a", media_type: "video" },
      { id: "p1", milestone_id: "a", media_type: "image" },
      { id: "p2", milestone_id: "a", media_type: "image" },
      { id: "v2", milestone_id: "b", media_type: "video" },
    ]);
    expect(tally.get("a")).toEqual({ photos: 2, files: 3, cover: "p1" });
    expect(tally.get("b")).toEqual({ photos: 0, files: 1, cover: null });
    expect(tally.has("c")).toBe(false);
  });

  it("names a moment's kind in sentence case and leaves a custom one unnamed", () => {
    expect(momentKindLabel("anniversary")).toBe("Anniversary");
    expect(momentKindLabel("first_date")).toBe("First date");
    expect(momentKindLabel("custom")).toBeNull();
    expect(momentKindLabel("")).toBeNull();
  });
});
