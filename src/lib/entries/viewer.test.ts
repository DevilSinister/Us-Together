import { describe, expect, it } from "vitest";
import { clampPan, crossesEntry, resist, swipeStep, verticalIntent, zoomAbout } from "./viewer";

const at = (kind: string, id: string) => ({ access: { kind, id } });

describe("sideways swipes", () => {
  const base = { width: 400, index: 3, count: 8 };

  it("moves forward on a long swipe left and back on a long swipe right", () => {
    expect(swipeStep({ ...base, dx: -120, ms: 600 })).toBe(1);
    expect(swipeStep({ ...base, dx: 120, ms: 600 })).toBe(-1);
  });

  it("counts a short, quick flick", () => {
    expect(swipeStep({ ...base, dx: -40, ms: 60 })).toBe(1);
  });

  it("ignores a short, slow drag and a tremor", () => {
    expect(swipeStep({ ...base, dx: -60, ms: 700 })).toBe(0);
    expect(swipeStep({ ...base, dx: -10, ms: 5 })).toBe(0);
  });

  it("never wraps from the last file to the first, or the first to the last", () => {
    expect(swipeStep({ ...base, index: 7, dx: -300, ms: 100 })).toBe(0);
    expect(swipeStep({ ...base, index: 0, dx: 300, ms: 100 })).toBe(0);
  });

  it("makes the ends push back instead of following the finger", () => {
    expect(resist(100, 0, 5)).toBe(30);
    expect(resist(-100, 4, 5)).toBe(-30);
    expect(resist(-100, 0, 5)).toBe(-100);
  });
});

describe("vertical swipes", () => {
  it("opens comments on a swipe up and closes on a long pull down", () => {
    expect(verticalIntent(-80)).toBe("comments");
    expect(verticalIntent(140)).toBe("close");
    expect(verticalIntent(40)).toBeNull();
    expect(verticalIntent(-20)).toBeNull();
  });
});

describe("stepping into another memory", () => {
  it("notices a change of memory or moment, and nothing else", () => {
    expect(crossesEntry(at("memory", "a"), at("memory", "b"))).toBe(true);
    expect(crossesEntry(at("memory", "a"), at("moment", "a"))).toBe(true);
    expect(crossesEntry(at("memory", "a"), at("memory", "a"))).toBe(false);
    expect(crossesEntry(undefined, at("memory", "a"))).toBe(false);
  });
});

describe("zooming", () => {
  it("keeps the tapped point in place", () => {
    const center = { x: 200, y: 400 };
    expect(zoomAbout(2, { x: 100, y: 400 }, center)).toEqual({ x: 100, y: 0 });
  });

  it("stops panning where the photo's edge meets the screen", () => {
    expect(clampPan({ x: 999, y: -999 }, 2, 400, 800)).toEqual({ x: 200, y: -400 });
    expect(clampPan({ x: 50, y: 50 }, 1, 400, 800)).toEqual({ x: 0, y: 0 });
  });
});
