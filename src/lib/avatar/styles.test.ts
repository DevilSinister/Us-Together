import { describe, it, expect } from "vitest";
import { avatarStyles, avatarStyleClasses, avatarStyleLabels, initials, isAvatarStyle, toAvatarStyle } from "./styles";

/** WCAG relative luminance and contrast, so the pairs are measured not assumed. */
function contrast(a: string, b: string) {
  const channel = (hex: string, i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe("avatar colours", () => {
  it("covers every style, in both themes, with a label", () => {
    for (const style of avatarStyles) {
      expect(avatarStyleClasses[style]).toContain("bg-[#");
      expect(avatarStyleClasses[style]).toContain("dark:bg-[#");
      expect(avatarStyleLabels[style]).toBeTruthy();
    }
  });

  it("keeps class strings whole, because Tailwind cannot see a computed name", () => {
    for (const style of avatarStyles) {
      expect(avatarStyleClasses[style]).not.toMatch(/\$\{|\+/);
    }
  });

  it("meets AA on all eight pairs - initials are small text, so 4.5:1 applies", () => {
    for (const style of avatarStyles) {
      const pairs = [...avatarStyleClasses[style].matchAll(/(dark:)?(bg|text)-\[(#[0-9a-f]{6})\]/g)];
      const pick = (dark: boolean, kind: string) =>
        pairs.find(p => Boolean(p[1]) === dark && p[2] === kind)![3];
      for (const dark of [false, true]) {
        const ratio = contrast(pick(dark, "bg"), pick(dark, "text"));
        expect(ratio, `${style} ${dark ? "dark" : "light"} measured ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("narrows an unknown value to the default rather than rendering an empty chip", () => {
    expect(isAvatarStyle("wine")).toBe(true);
    expect(isAvatarStyle("teal")).toBe(false);
    expect(toAvatarStyle("teal")).toBe("rose");
    expect(toAvatarStyle(undefined)).toBe("rose");
    expect(toAvatarStyle("plum")).toBe("plum");
  });
});

describe("initials", () => {
  it("takes one letter from each of the first two words", () => {
    expect(initials("Alex Rivera")).toBe("AR");
    expect(initials("Alex")).toBe("A");
    expect(initials("Alex Maria Rivera")).toBe("AM");
  });

  it("does not split an emoji or a combining mark in half", () => {
    // The old name.slice(0, 1) returned half a surrogate pair here.
    expect(initials("👩‍❤️‍👨 Us")).toBe("👩‍❤️‍👨U");
    expect(initials("Ǎnna")).toBe("Ǎ");
  });

  it("returns nothing for an absent or blank name, so the caller can use an icon", () => {
    expect(initials(null)).toBe("");
    expect(initials("   ")).toBe("");
  });
});
