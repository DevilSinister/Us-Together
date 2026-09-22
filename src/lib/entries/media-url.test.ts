import { describe, it, expect } from "vitest";
import { mediaHref } from "./media-url";

describe("private media addresses", () => {
  it("builds the route for each kind and variant", () => {
    expect(mediaHref("abc", "memory")).toBe("/api/memory-media/abc?kind=memory&variant=original");
    expect(mediaHref("abc", "memory", "preview")).toBe("/api/memory-media/abc?kind=memory&variant=preview");
    expect(mediaHref("abc", "moment", "download")).toBe("/api/memory-media/abc?kind=moment&variant=download");
  });

  it("encodes the id so it cannot escape its path segment", () => {
    expect(mediaHref("a/b?c", "memory")).toBe("/api/memory-media/a%2Fb%3Fc?kind=memory&variant=original");
  });
});
