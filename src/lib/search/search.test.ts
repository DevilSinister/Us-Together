import { describe, expect, it } from "vitest";
import { matchScore, normalize } from "./match";
import { activeFilterCount, sectionForPath } from "./sections";

describe("search matching", () => {
  it("folds case and accents", () => {
    expect(normalize("  Café NOIR ")).toBe("cafe noir");
    expect(matchScore("cafe", "Breakfast at Café Noir")).toBeGreaterThan(0);
  });

  it("needs every word, wherever it appears", () => {
    expect(matchScore("rainy chai", "Rainy chai after work")).toBe(3);
    expect(matchScore("chai rainy", "Rainy chai after work")).toBe(2);
    expect(matchScore("harbour light", "An evening", ["The last light on the harbour"])).toBe(1);
    expect(matchScore("harbour snow", "An evening", ["The last light on the harbour"])).toBe(0);
  });

  it("matches nothing for an empty query", () => {
    expect(matchScore("   ", "Anything")).toBe(0);
  });
});

describe("search sections", () => {
  it("maps each screen to the section it searches", () => {
    expect(sectionForPath("/memories")).toBe("memories");
    expect(sectionForPath("/memories/abc")).toBe("memories");
    expect(sectionForPath("/milestones/new")).toBe("moments");
    expect(sectionForPath("/calendar")).toBe("plans");
    expect(sectionForPath("/wishlist")).toBe("wishes");
    expect(sectionForPath("/home")).toBeNull();
    expect(sectionForPath("/gallery")).toBeNull();
  });

  it("counts only the section's own filters", () => {
    expect(activeFilterCount("memories", { favorites: true, tag: "travel", featured: true })).toBe(2);
    expect(activeFilterCount("moments", { favorites: true })).toBe(0);
    expect(activeFilterCount("plans", { when: "upcoming" })).toBe(1);
  });
});
