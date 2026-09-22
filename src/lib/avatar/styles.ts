/**
 * The four avatar colours.
 *
 * These literals were hardcoded inside the onboarding form and used only to
 * paint a radio group; the chosen value was then discarded for every real
 * account. They live here now because three surfaces need them - the onboarding
 * picker, the profile editor and the Avatar itself - and because the value is
 * finally persisted.
 *
 * The class strings must stay whole. Tailwind reads source text, so a computed
 * or interpolated class name is simply never generated.
 *
 * Light values are exactly what shipped. Dark pairs are new, drawn from the
 * existing .dark palette in globals.css; see styles.test.ts, which measures
 * every pair rather than trusting them.
 */

export const avatarStyles = ["rose", "wine", "blush", "plum"] as const;
export type AvatarStyle = (typeof avatarStyles)[number];

export const avatarStyleLabels: Record<AvatarStyle, string> = {
  rose: "Rose",
  wine: "Wine",
  blush: "Blush",
  plum: "Plum",
};

export const avatarStyleClasses: Record<AvatarStyle, string> = {
  rose: "bg-[#efd5d9] text-[#6f1730] dark:bg-[#4a2b34] dark:text-[#f3d3da]",
  wine: "bg-[#6f1730] text-[#fff9f6] dark:bg-[#8f2943] dark:text-[#fff1f4]",
  blush: "bg-[#f4e7e5] text-[#542b34] dark:bg-[#3b2a34] dark:text-[#fae8e7]",
  plum: "bg-[#3b2a34] text-[#fae8e7] dark:bg-[#2b1f27] dark:text-[#f0d9de]",
};

export function isAvatarStyle(value: unknown): value is AvatarStyle {
  return typeof value === "string" && (avatarStyles as readonly string[]).includes(value);
}

/** Anything unrecognised becomes the default rather than an empty chip. */
export function toAvatarStyle(value: unknown): AvatarStyle {
  return isAvatarStyle(value) ? value : "rose";
}

/**
 * Up to two initials.
 *
 * Segmented by grapheme, not by code unit: `name.slice(0, 1)` - which is what
 * the onboarding form used - splits an emoji or a combining mark in half and
 * renders a replacement character.
 */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!words.length) return "";
  const first = (word: string) => {
    if (typeof Intl.Segmenter === "function") {
      const step = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word)[Symbol.iterator]().next();
      return step.done ? "" : step.value.segment;
    }
    return Array.from(word)[0] ?? "";
  };
  return words.map(first).join("").toUpperCase();
}
