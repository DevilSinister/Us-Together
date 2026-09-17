import { describe, expect, it } from "vitest";
import { fillPixels, hexRgb } from "./canvas";

describe("drawing fill", () => {
  it("fills only the connected region and keeps the boundary", () => {
    const data = new Uint8ClampedArray(3 * 3 * 4);
    for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; }
    for (let y = 0; y < 3; y++) { const i = (y * 3 + 1) * 4; data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; }
    const image = { width: 3, height: 3, data } as ImageData;
    expect(fillPixels(image, 0, 1, hexRgb("#6f1730"))).toBe(true);
    expect(Array.from(data.slice(0, 4))).toEqual([111, 23, 48, 255]);
    expect(Array.from(data.slice(4, 8))).toEqual([0, 0, 0, 255]);
    expect(Array.from(data.slice(8, 12))).toEqual([255, 255, 255, 255]);
    expect(fillPixels(image, -1, 0, hexRgb("#ffffff"))).toBe(false);
  });
});
