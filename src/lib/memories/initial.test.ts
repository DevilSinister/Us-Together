import { describe, expect, it } from "vitest";
import { memoryInitial } from "./initial";

describe("memoryInitial", () => {
  it("takes the first word that starts with a letter", () => {
    expect(memoryInitial("Special one")).toBe("S");
    expect(memoryInitial("5 meetup")).toBe("M");
    expect(memoryInitial("3rd Date")).toBe("D");
    expect(memoryInitial("4 Meetup❤️")).toBe("M");
    expect(memoryInitial("  évening walk")).toBe("É");
  });

  it("gives up on titles with no lettered word", () => {
    expect(memoryInitial("2026 ❤️")).toBeNull();
    expect(memoryInitial("")).toBeNull();
  });
});
