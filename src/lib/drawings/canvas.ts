export const WIDTH = 640;
export const HEIGHT = 480;
export const SWATCHES = ["#2f2527", "#6f1730", "#e45a83", "#f7836b", "#f4a646", "#f2d958", "#86b65b", "#5c8d78", "#50a9c5", "#805b9b", "#ffffff"] as const;

/** Bounded, four-neighbour fill. Alpha is kept opaque for a printable note. */
export function fillPixels(image: ImageData, x: number, y: number, color: [number, number, number]): boolean {
  const { width, height, data } = image;
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const start = (y * width + x) * 4;
  const original = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  if (original[0] === color[0] && original[1] === color[1] && original[2] === color[2] && original[3] === 255) return false;
  const stack = [y * width + x];
  const seen = new Uint8Array(width * height);
  while (stack.length) {
    const position = stack.pop()!;
    if (seen[position]) continue;
    seen[position] = 1;
    const offset = position * 4;
    if (data[offset] !== original[0] || data[offset + 1] !== original[1] ||
        data[offset + 2] !== original[2] || data[offset + 3] !== original[3]) continue;
    data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]; data[offset + 3] = 255;
    const px = position % width, py = Math.floor(position / width);
    if (px > 0) stack.push(position - 1);
    if (px < width - 1) stack.push(position + 1);
    if (py > 0) stack.push(position - width);
    if (py < height - 1) stack.push(position + width);
  }
  return true;
}

export function hexRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
