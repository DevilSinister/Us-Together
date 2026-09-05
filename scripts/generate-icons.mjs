// Rasterises the brand mark into the PNG sizes installability actually requires.
//
// Chrome accepts the SVG, but iOS reads only apple-touch-icon and ignores SVG there,
// and an installed iOS Home Screen app is the precondition for Web Push on iOS. The
// generated files are committed; run this only when the mark itself changes.
//
//   npm run icons

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Image } from "imagescript";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const heart = '<path d="M256 375C165 320 111 271 111 205c0-50 35-86 82-86 31 0 51 16 63 35 12-19 32-35 63-35 47 0 82 36 82 86 0 66-54 115-145 170Z" fill="none" stroke="#fff9f6" stroke-width="28" stroke-linejoin="round"/><path d="M194 223h124" stroke="#df879a" stroke-width="22" stroke-linecap="round"/>';

/** `rx` is the app's own rounding; `inset` shrinks the mark into a maskable safe zone. */
const source = ({ rx = 112, inset = 1 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Us Together">` +
  `<rect width="512" height="512" rx="${rx}" fill="#6f1730"/>` +
  `<g transform="translate(${(256 * (1 - inset)).toFixed(3)} ${(256 * (1 - inset)).toFixed(3)}) scale(${inset})">${heart}</g>` +
  `</svg>`;

// A maskable icon is cropped to a circle of 80% width, so the mark stays inside it.
// Apple applies its own rounding, so a pre-rounded square would show dark corners.
const targets = [
  { file: "icon-192.png", size: 192, svg: source() },
  { file: "icon-512.png", size: 512, svg: source() },
  { file: "icon-maskable-512.png", size: 512, svg: source({ inset: 0.62 }) },
  { file: "apple-touch-icon.png", size: 180, svg: source({ rx: 0 }) },
];

for (const { file, size, svg } of targets) {
  const image = await Image.renderSVG(svg, size, Image.SVG_MODE_WIDTH);
  await writeFile(join(publicDir, file), await image.encode(9));
  console.log(`${file} ${image.width}x${image.height}`);
}
