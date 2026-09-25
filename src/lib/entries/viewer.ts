/**
 * The decisions behind the full-screen photo viewer, kept pure so they can be
 * tested without a finger.
 *
 * The viewer behaves like a phone's own photo app: a sideways swipe moves to
 * the neighbouring file, a swipe up opens the comments, a swipe down puts the
 * photo away, and nothing wraps around - the first and last files push back
 * instead of jumping to the other end.
 */

type Entry = { access: { kind: string; id: string } };

/** A swipe must travel this share of the screen, or be flicked, to count. */
const DISTANCE = 0.22;
/** px per ms. A quick flick counts even when it travels only a little. */
const VELOCITY = 0.45;
const FLICK_MIN = 24;

export const COMMENTS_SWIPE = 56;
export const CLOSE_SWIPE = 110;

/** Which way a finished sideways swipe moves: -1 back, 1 forward, 0 stays. */
export function swipeStep({ dx, ms, width, index, count }: { dx: number; ms: number; width: number; index: number; count: number }): -1 | 0 | 1 {
  const velocity = Math.abs(dx) / Math.max(ms, 1);
  const far = Math.abs(dx) > width * DISTANCE || (velocity > VELOCITY && Math.abs(dx) > FLICK_MIN);
  if (!far) return 0;
  const step = dx < 0 ? 1 : -1;
  const target = index + step;
  return target < 0 || target >= count ? 0 : step;
}

/** What a finished vertical swipe means: up opens comments, a long pull down closes. */
export function verticalIntent(dy: number): "comments" | "close" | null {
  if (dy <= -COMMENTS_SWIPE) return "comments";
  if (dy >= CLOSE_SWIPE) return "close";
  return null;
}

/** The first and last files resist being dragged past, rather than following the finger. */
export function resist(dx: number, index: number, count: number): number {
  const pastStart = index === 0 && dx > 0;
  const pastEnd = index === count - 1 && dx < 0;
  return pastStart || pastEnd ? dx * 0.3 : dx;
}

export function entryKey(item: Entry): string {
  return item.access.kind + ":" + item.access.id;
}

/** True when moving from one file to the next steps into a different memory or moment. */
export function crossesEntry(from: Entry | undefined, to: Entry | undefined): boolean {
  return !!from && !!to && entryKey(from) !== entryKey(to);
}

export const MAX_SCALE = 4;

/**
 * Zooming about a point: the spot under the finger stays under the finger.
 * `point` and `center` are in screen pixels; the result is the pan offset.
 */
export function zoomAbout(scale: number, point: { x: number; y: number }, center: { x: number; y: number }) {
  return clampPan({ x: (center.x - point.x) * (scale - 1), y: (center.y - point.y) * (scale - 1) }, scale, center.x * 2, center.y * 2);
}

/** A zoomed photo can be panned until its edge meets the screen edge, and no further. */
export function clampPan(pan: { x: number; y: number }, scale: number, width: number, height: number) {
  const maxX = Math.max(0, ((scale - 1) * width) / 2);
  const maxY = Math.max(0, ((scale - 1) * height) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, pan.x)) || 0, y: Math.min(maxY, Math.max(-maxY, pan.y)) || 0 };
}
