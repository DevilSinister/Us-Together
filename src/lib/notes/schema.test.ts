import { describe, expect, it } from "vitest";
import { noteExcerpt, noteInput, noteTypeLabels } from "./schema";

describe("note input", () => {
  it("defaults to a shared note", () => {
    expect(noteInput.parse({ title: "Hello", body: "A line" }).type).toBe("shared");
  });

  it("accepts both documented types and nothing else", () => {
    expect(noteInput.parse({ type: "private", title: "Hello", body: "A line" }).type).toBe("private");
    expect(noteInput.safeParse({ type: "surprise", title: "Hello", body: "A line" }).success).toBe(false);
    expect(noteInput.safeParse({ type: "scheduled", title: "Hello", body: "A line" }).success).toBe(false);
  });

  it("requires real content in both fields", () => {
    expect(noteInput.safeParse({ title: "   ", body: "A line" }).success).toBe(false);
    expect(noteInput.safeParse({ title: "Hello", body: "   " }).success).toBe(false);
  });

  it("bounds the body to the column limit", () => {
    expect(noteInput.safeParse({ title: "Hello", body: "a".repeat(20000) }).success).toBe(true);
    expect(noteInput.safeParse({ title: "Hello", body: "a".repeat(20001) }).success).toBe(false);
  });

  it("never accepts an author or couple from the caller", () => {
    const parsed = noteInput.parse({ title: "Hello", body: "A line", authorId: "0197a0e1-0000-4000-8000-000000000009", coupleId: "0197a0e1-0000-4000-8000-000000000008" });
    expect("authorId" in parsed).toBe(false);
    expect("coupleId" in parsed).toBe(false);
  });

  it("trims surrounding whitespace rather than storing it", () => {
    expect(noteInput.parse({ title: "  Hello  ", body: "  A line  " })).toMatchObject({ title: "Hello", body: "A line" });
  });
});

describe("note excerpt", () => {
  it("collapses whitespace so a preview stays one readable line", () => {
    expect(noteExcerpt(["One", "", "two   three"].join("\n"))).toBe("One two three");
  });

  it("truncates long bodies without cutting mid-whitespace", () => {
    const excerpt = noteExcerpt("word ".repeat(80), 20);
    expect(excerpt.endsWith("...")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(23);
  });

  it("leaves a short body alone", () => {
    expect(noteExcerpt("Short enough")).toBe("Short enough");
  });

  it("treats markup as literal text, never as markup", () => {
    const body = "<script>alert(1)</script>";
    expect(noteExcerpt(body)).toBe(body);
  });
});

describe("note labels", () => {
  it("states the visibility of each type in words", () => {
    expect(noteTypeLabels.shared).toMatch(/partner/i);
    expect(noteTypeLabels.private).toMatch(/you/i);
  });
});
