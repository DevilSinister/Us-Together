import { describe, expect, it } from "vitest";
import { clampCrop, coverBox, drawPlan, imageBox, INITIAL_CROP, MAX_ZOOM, rotate } from "./crop";

describe("covering the crop window", () => {
  it("fits a landscape photo by its height and a portrait photo by its width", () => {
    expect(coverBox(4000, 3000, 0, 1)).toEqual({ width: 4000 / 3000, height: 1 });
    expect(coverBox(3000, 4000, 0, 1)).toEqual({ width: 1, height: 4000 / 3000 });
  });

  it("swaps the footprint when the photo is turned a quarter", () => {
    const turned = coverBox(4000, 3000, 90, 1);
    expect(turned.width).toBeCloseTo(1);
    expect(turned.height).toBeCloseTo(4000 / 3000);
    // The unrotated box is what gets drawn; it keeps the photo's own proportions.
    const box = imageBox(4000, 3000, 90, 1);
    expect(box.width / box.height).toBeCloseTo(4000 / 3000);
  });

  it("grows with zoom", () => {
    expect(coverBox(1000, 1000, 0, 2)).toEqual({ width: 2, height: 2 });
  });
});

describe("keeping the frame full", () => {
  it("lets a square photo move only once it is zoomed in", () => {
    expect(clampCrop({ ...INITIAL_CROP, x: 0.4, y: -0.4 }, 800, 800)).toEqual(INITIAL_CROP);
    expect(clampCrop({ zoom: 2, rotation: 0, x: 0.8, y: -0.8 }, 800, 800)).toEqual({ zoom: 2, rotation: 0, x: 0.5, y: -0.5 });
  });

  it("allows sideways travel on a wide photo but no vertical travel at zoom 1", () => {
    const crop = clampCrop({ zoom: 1, rotation: 0, x: 5, y: 5 }, 2000, 1000);
    expect(crop.x).toBeCloseTo(0.5);
    expect(crop.y).toBe(0);
  });

  it("follows the rotation when deciding which way the photo can travel", () => {
    const crop = clampCrop({ zoom: 1, rotation: 90, x: 5, y: 5 }, 2000, 1000);
    expect(crop.x).toBe(0);
    expect(crop.y).toBeCloseTo(0.5);
  });

  it("keeps zoom inside its range", () => {
    expect(clampCrop({ ...INITIAL_CROP, zoom: 99 }, 10, 10).zoom).toBe(MAX_ZOOM);
    expect(clampCrop({ ...INITIAL_CROP, zoom: 0.2 }, 10, 10).zoom).toBe(1);
    expect(clampCrop({ ...INITIAL_CROP, zoom: Number.NaN }, 10, 10).zoom).toBe(1);
  });
});

describe("turning", () => {
  it("wraps in both directions", () => {
    expect(rotate(270, 1)).toBe(0);
    expect(rotate(0, -1)).toBe(270);
    expect(rotate(90, 1)).toBe(180);
  });
});

describe("drawing the final picture", () => {
  it("centres an untouched crop and covers the canvas exactly", () => {
    const plan = drawPlan(INITIAL_CROP, 3000, 2000, 640);
    expect(plan.translateX).toBe(320);
    expect(plan.translateY).toBe(320);
    expect(plan.radians).toBe(0);
    expect(plan.drawHeight).toBeCloseTo(640);
    expect(plan.drawWidth).toBeCloseTo(960);
  });

  it("carries the framing offset and the turn into canvas space", () => {
    const plan = drawPlan({ zoom: 2, rotation: 90, x: 0.25, y: -0.25 }, 1000, 1000, 640);
    expect(plan.translateX).toBe(480);
    expect(plan.translateY).toBe(160);
    expect(plan.radians).toBeCloseTo(Math.PI / 2);
    expect(plan.drawWidth).toBeCloseTo(1280);
  });

  it("never draws from an unclamped offset", () => {
    const plan = drawPlan({ zoom: 1, rotation: 0, x: 3, y: 3 }, 1000, 1000, 640);
    expect(plan.translateX).toBe(320);
    expect(plan.translateY).toBe(320);
  });
});
