import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("offers a drawing shortcut alongside notes, plans and memories", () => {
    const urls = (manifest().shortcuts ?? []).map((shortcut) => shortcut.url);
    expect(urls.some((url) => url.startsWith("/drawings/new"))).toBe(true);
    expect(urls.some((url) => url.startsWith("/notes/new"))).toBe(true);
  });
  it("keeps every shortcut inside the app scope", () => {
    for (const shortcut of manifest().shortcuts ?? []) expect(shortcut.url.startsWith("/")).toBe(true);
  });
});
