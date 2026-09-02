export const imageLimit = 5 * 1024 * 1024;
export const videoLimit = 20 * 1024 * 1024;
export const mediaTypes = ["image/jpeg", "image/png", "video/mp4", "video/webm"] as const;
export type MediaMime = typeof mediaTypes[number];
export function validateUpload(name: string, mime: string, size: number) {
  const extensions: Record<string, RegExp> = { "image/jpeg": /\.jpe?g$/i, "image/png": /\.png$/i, "video/mp4": /\.mp4$/i, "video/webm": /\.webm$/i };
  if (!extensions[mime]?.test(name) || !Number.isSafeInteger(size) || size < 1 || size > (mime.startsWith("image/") ? imageLimit : videoLimit))
    throw new Error("Choose a JPEG or PNG up to 5 MB, or an MP4 or WebM up to 20 MB.");
}
const ascii = (b: Uint8Array, a: number, z: number) => String.fromCharCode(...b.subarray(a, z));
function dimensions(width: number, height: number, video = false) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > (video ? 3840 * 2160 : 8000000))
    throw new Error(video ? "Video must be no larger than 4K." : "Choose a photo with no more than 8 megapixels.");
  return { width, height };
}
export function inspectMedia(bytes: Uint8Array, mime: string): { width: number; height: number; duration: number | null } {
  const b = bytes, v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (!b.length || b.length > (mime.startsWith("image/") ? imageLimit : videoLimit)) throw new Error("Unsupported file size.");
  if (mime === "image/png") {
    if (b.length < 33 || ascii(b, 1, 4) !== "PNG" || b[0] !== 137 || ascii(b, 12, 16) !== "IHDR" || v.getUint32(8) !== 13) throw new Error("The photo is not a valid PNG.");
    return { ...dimensions(v.getUint32(16), v.getUint32(20)), duration: null };
  }
  if (mime === "image/jpeg") {
    if (b[0] !== 255 || b[1] !== 216 || b[b.length - 2] !== 255 || b[b.length - 1] !== 217) throw new Error("The photo is not a complete JPEG.");
    let p = 2;
    while (p + 8 < b.length) {
      if (b[p++] !== 255) break;
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 217 || marker === 218) break;
      const length = v.getUint16(p);
      if (length < 2 || p + length > b.length) break;
      if ([192, 193, 194].includes(marker)) return { ...dimensions(v.getUint16(p + 5), v.getUint16(p + 3)), duration: null };
      p += length;
    }
    throw new Error("The photo is not a supported JPEG.");
  }
  let duration = 0, width = 0, height = 0;
  if (mime === "video/mp4") {
    if (b.length < 24 || ascii(b, 4, 8) !== "ftyp") throw new Error("The video is not a valid MP4.");
    let hasMedia = false;
    const boxes = (start: number, end: number, depth: number) => {
      if (depth > 6) throw new Error("Invalid MP4 nesting.");
      let p = start;
      while (p + 8 <= end) {
        let size = v.getUint32(p), header = 8;
        const type = ascii(b, p + 4, p + 8);
        if (size === 1) { if (p + 16 > end) throw new Error("Invalid MP4."); size = Number(v.getBigUint64(p + 8)); header = 16; }
        if (size === 0) size = end - p;
        if (size < header || p + size > end) throw new Error("The video is incomplete.");
        const q = p + header;
        if (type === "mdat") hasMedia = size > header;
        if (["moov", "trak", "mdia"].includes(type)) boxes(q, p + size, depth + 1);
        if (type === "mvhd" && size >= header + 24) {
          const version = b[q], scalePos = q + (version === 1 ? 20 : 12);
          if (scalePos + (version === 1 ? 12 : 8) > p + size) throw new Error("Invalid MP4 timing.");
          const scale = v.getUint32(scalePos);
          duration = (version === 1 ? Number(v.getBigUint64(scalePos + 4)) : v.getUint32(scalePos + 4)) / scale;
        }
        if (type === "tkhd" && size >= header + 84) {
          const w = v.getUint32(p + size - 8) / 65536, h = v.getUint32(p + size - 4) / 65536;
          if (w * h > width * height) { width = Math.round(w); height = Math.round(h); }
        }
        p += size;
      }
      if (p !== end) throw new Error("Invalid MP4 box.");
    };
    boxes(0, b.length, 0);
    if (!hasMedia) throw new Error("The video contains no media.");
  } else if (mime === "video/webm") {
    if (b.length < 16 || v.getUint32(0) !== 0x1a45dfa3) throw new Error("The video is not a valid WebM.");
    let scale = 1000000, ticks = 0, webm = false, cluster = false;
    const vint = (p: number, id: boolean) => {
      if (p >= b.length || b[p] === 0) throw new Error("Invalid WebM.");
      let n = 1; while (n <= 8 && !(b[p] & (128 >> (n - 1)))) n++;
      if (n > (id ? 4 : 8) || p + n > b.length) throw new Error("Invalid WebM.");
      let value = id ? b[p] : b[p] & ((1 << (8 - n)) - 1);
      for (let i = 1; i < n; i++) value = value * 256 + b[p + i];
      return { value, n, unknown: !id && value === 2 ** (7 * n) - 1 };
    };
    const uint = (p: number, n: number) => { if (n > 8) throw new Error("Invalid WebM."); let x = 0; for (let i = 0; i < n; i++) x = x * 256 + b[p + i]; return x; };
    const elements = (start: number, end: number, depth: number) => {
      if (depth > 6) throw new Error("Invalid WebM nesting.");
      let p = start;
      while (p < end) {
        const id = vint(p, true); p += id.n;
        const len = vint(p, false); p += len.n;
        const size = len.unknown ? end - p : len.value;
        if (!Number.isSafeInteger(size) || p + size > end) throw new Error("The video is incomplete.");
        if (id.value === 0x4282) webm = ascii(b, p, p + size) === "webm";
        if (id.value === 0x2ad7b1) scale = uint(p, size);
        if (id.value === 0x4489) ticks = size === 4 ? v.getFloat32(p) : size === 8 ? v.getFloat64(p) : NaN;
        if (id.value === 0xb0) width = uint(p, size);
        if (id.value === 0xba) height = uint(p, size);
        if (id.value === 0x1f43b675) cluster = size > 0;
        if ([0x1a45dfa3,0x18538067,0x1549a966,0x1654ae6b,0xae,0xe0].includes(id.value)) elements(p, p + size, depth + 1);
        p += size;
      }
    };
    elements(0, b.length, 0); duration = ticks * scale / 1000000000;
    if (!webm || !cluster) throw new Error("The video is not a complete WebM.");
  } else throw new Error("Unsupported media type.");
  if (!Number.isFinite(duration) || duration <= 0 || duration > 300) throw new Error("Choose a video with a valid duration of five minutes or less.");
  return { ...dimensions(width, height, true), duration };
}
