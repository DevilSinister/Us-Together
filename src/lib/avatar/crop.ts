/**
 * The geometry behind the profile-picture editor.
 *
 * Everything is measured in *viewport units*: 1 is the width of the square crop
 * window, whatever size it is drawn at. That keeps the state independent of the
 * screen - a crop framed on a phone produces the same picture as on a desktop -
 * and lets the same numbers drive both the live preview and the final canvas.
 *
 * At zoom 1 the photo exactly covers the window along its shorter side, and the
 * offsets are clamped so it always does: there is no way to frame an empty
 * corner into someone's avatar.
 */

export type Rotation = 0 | 90 | 180 | 270;
export type Crop = { zoom: number; rotation: Rotation; x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const OUTPUT_SIZE = 640;
export const INITIAL_CROP: Crop = { zoom: 1, rotation: 0, x: 0, y: 0 };

export function rotate(rotation: Rotation, direction: 1 | -1): Rotation {
  return (((rotation + direction * 90) % 360) + 360) % 360 as Rotation;
}

/** The photo's width and height in viewport units, before rotation is applied. */
export function imageBox(width: number, height: number, rotation: Rotation, zoom: number) {
  const turned = rotation % 180 !== 0;
  const across = turned ? height : width;
  const down = turned ? width : height;
  // Scale so the rotated photo covers a 1x1 window along its shorter side.
  const scale = Math.max(1 / across, 1 / down) * zoom;
  return { width: width * scale, height: height * scale };
}

/** The rotated photo's footprint in viewport units - what the window sees. */
export function coverBox(width: number, height: number, rotation: Rotation, zoom: number) {
  const box = imageBox(width, height, rotation, zoom);
  return rotation % 180 !== 0 ? { width: box.height, height: box.width } : box;
}

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(zoom) ? zoom : MIN_ZOOM));
}

/** Keeps the photo covering the window: an edge may reach the frame, never cross it. */
export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const zoom = clampZoom(crop.zoom);
  const cover = coverBox(width, height, crop.rotation, zoom);
  const maxX = Math.max(0, (cover.width - 1) / 2);
  const maxY = Math.max(0, (cover.height - 1) / 2);
  const x = Math.min(maxX, Math.max(-maxX, crop.x));
  const y = Math.min(maxY, Math.max(-maxY, crop.y));
  // Normalise -0 so equality checks and snapshots stay honest.
  return { zoom, rotation: crop.rotation, x: x || 0, y: y || 0 };
}

/**
 * The drawing instructions for a square canvas of `size` pixels: move to the
 * framed centre, turn, then draw the photo centred on that point. The live
 * preview applies the same three steps as a CSS transform.
 */
export function drawPlan(crop: Crop, width: number, height: number, size = OUTPUT_SIZE) {
  const c = clampCrop(crop, width, height);
  const box = imageBox(width, height, c.rotation, c.zoom);
  return {
    translateX: size / 2 + c.x * size,
    translateY: size / 2 + c.y * size,
    radians: (c.rotation * Math.PI) / 180,
    drawWidth: box.width * size,
    drawHeight: box.height * size,
  };
}
