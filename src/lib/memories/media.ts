export const imageLimit = 15 * 1024 * 1024;
export const videoLimit = 20 * 1024 * 1024;
export const maxImagePixels = 25000000;
export const maxImageEdge = 12000;

export const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"] as const;
export const videoTypes = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const mediaTypes = [...imageTypes, ...videoTypes] as const;
export type MediaMime = typeof mediaTypes[number];

const extensions: Record<MediaMime, RegExp> = {
  "image/jpeg": /\.(jpe?g|jfif)$/i,
  "image/png": /\.png$/i,
  "image/webp": /\.webp$/i,
  "image/gif": /\.gif$/i,
  "image/avif": /\.avif$/i,
  "image/heic": /\.heic$/i,
  "image/heif": /\.heif$/i,
  "video/mp4": /\.(mp4|m4v)$/i,
  "video/webm": /\.webm$/i,
  "video/quicktime": /\.mov$/i,
};

/** Types a browser reports for files this app already accepts under another name. */
const aliases: Record<string, MediaMime> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/heic-sequence": "image/heic",
  "image/heif-sequence": "image/heif",
  "video/x-m4v": "video/mp4",
  "video/mov": "video/quicktime",
  "video/x-quicktime": "video/quicktime",
};

export const acceptAttribute = mediaTypes.join(",");
export const acceptedMedia = "JPEG, PNG, WebP, GIF, AVIF or HEIC photos up to 15 MB, and MP4, MOV or WebM videos up to 20 MB.";

export function isImage(mime: string) {
  return (imageTypes as readonly string[]).includes(mime);
}

/**
 * Image types a browser can paint directly. HEIC and HEIF are accepted and
 * stored, but only Safari renders them, so everywhere else shows the JPEG
 * preview this app derives rather than a broken image.
 */
export function rendersInBrowser(mime: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(mime);
}

/** The file extension a download should carry for a stored type. */
export function extensionFor(mime: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" } as Record<string, string>)[mime] ?? "bin";
}

/**
 * The type this file should be uploaded as.
 *
 * Browsers disagree about media types: a HEIC or MOV picked on one platform
 * arrives with an empty type, and several report legacy aliases. Falling back
 * to the file name keeps an ordinary phone photo from being refused over a
 * disagreement the person never sees.
 */
export function resolveMime(name: string, reported = ""): string {
  const declared = reported.toLowerCase().split(";")[0].trim();
  if ((mediaTypes as readonly string[]).includes(declared)) return declared;
  if (aliases[declared]) return aliases[declared];
  for (const [mime, pattern] of Object.entries(extensions)) if (pattern.test(name)) return mime;
  return declared;
}

export function validateUpload(name: string, mime: string, size: number) {
  const pattern = extensions[mime as MediaMime];
  if (!pattern || !pattern.test(name)) throw new Error("This file type is not supported. Choose " + acceptedMedia);
  const image = isImage(mime), limit = image ? imageLimit : videoLimit;
  if (!Number.isSafeInteger(size) || size < 1) throw new Error("This file is empty. Choose the file again.");
  if (size > limit) throw new Error(image ? "Photos can be up to 15 MB. Choose a smaller photo." : "Videos can be up to 20 MB. Choose a shorter or smaller video.");
}

const ascii = (b: Uint8Array, a: number, z: number) => String.fromCharCode(...b.subarray(a, z));

/** The bound every photo must satisfy, whether measured here or by the decoder. */
export function checkImageSize(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > maxImageEdge || height > maxImageEdge || width * height > maxImagePixels)
    throw new Error("Choose a photo up to 25 megapixels, with neither side over 12000 pixels.");
  return { width, height };
}

function checkVideoSize(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 3840 * 2160)
    throw new Error("Video must be no larger than 4K.");
  return { width, height };
}

function jpeg(b: Uint8Array, v: DataView) {
  if (b.length < 4 || b[0] !== 255 || b[1] !== 216) throw new Error("The photo is not a JPEG.");
  // A complete JPEG carries an end-of-image marker, but it is often not the
  // final two bytes: phones append motion-photo payloads, extra thumbnails and
  // padding after it. Search for the marker instead of demanding it sit last,
  // so an ordinary camera photo is not refused as truncated.
  let complete = false;
  for (let i = b.length - 2; i >= 2 && !complete; i--) complete = b[i] === 255 && b[i + 1] === 217;
  if (!complete) throw new Error("The photo is not a complete JPEG. It may have been cut short, so choose the file again.");
  let p = 2;
  while (p + 3 < b.length) {
    if (b[p] !== 255) { p++; continue; }
    while (b[p] === 255) p++;
    const marker = b[p++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (p + 2 > b.length) break;
    const length = v.getUint16(p);
    if (length < 2 || p + length > b.length) break;
    // Every start-of-frame marker states the size, including the progressive and
    // arithmetic variants. 0xC4, 0xC8 and 0xCC sit in the range but are not frames.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (p + 7 > b.length) break;
      return checkImageSize(v.getUint16(p + 5), v.getUint16(p + 3));
    }
    p += length;
  }
  throw new Error("The photo is not a supported JPEG.");
}

function webp(b: Uint8Array, v: DataView) {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WEBP") throw new Error("The photo is not a valid WebP.");
  const chunk = ascii(b, 12, 16);
  if (chunk === "VP8X") return checkImageSize(1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)));
  if (chunk === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) throw new Error("The photo is not a valid WebP.");
    return checkImageSize(v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff);
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) throw new Error("The photo is not a valid WebP.");
    const bits = v.getUint32(21, true);
    return checkImageSize(1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff));
  }
  throw new Error("The photo is not a supported WebP.");
}

function gif(b: Uint8Array, v: DataView) {
  if (b.length < 10 || ascii(b, 0, 3) !== "GIF" || !["87a", "89a"].includes(ascii(b, 3, 6))) throw new Error("The photo is not a valid GIF.");
  return checkImageSize(v.getUint16(6, true), v.getUint16(8, true));
}

/** AVIF, HEIC and HEIF all state their size in an ISO base-media `ispe` box. */
function isoImage(b: Uint8Array, v: DataView, label: string) {
  if (b.length < 16 || ascii(b, 4, 8) !== "ftyp") throw new Error("The photo is not a valid " + label + ".");
  let width = 0, height = 0;
  const walk = (start: number, end: number, depth: number) => {
    if (depth > 8) return;
    let p = start;
    while (p + 8 <= end) {
      let size = v.getUint32(p), header = 8;
      const type = ascii(b, p + 4, p + 8);
      if (size === 1) { if (p + 16 > end) return; size = Number(v.getBigUint64(p + 8)); header = 16; }
      if (size === 0) size = end - p;
      if (size < header || p + size > end) return;
      const q = p + header;
      if (type === "meta") walk(q + 4, p + size, depth + 1);
      else if (["iprp", "ipco", "iinf", "moov", "trak", "mdia"].includes(type)) walk(q, p + size, depth + 1);
      else if (type === "ispe" && q + 12 <= p + size) {
        const w = v.getUint32(q + 4), h = v.getUint32(q + 8);
        if (w * h > width * height) { width = w; height = h; }
      }
      p += size;
    }
  };
  walk(0, b.length, 0);
  if (!width || !height) throw new Error("The photo is not a supported " + label + ".");
  return checkImageSize(width, height);
}

export function inspectMedia(bytes: Uint8Array, mime: string): { width: number; height: number; duration: number | null } {
  const b = bytes, v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (!b.length || b.length > (isImage(mime) ? imageLimit : videoLimit)) throw new Error("Unsupported file size.");
  if (mime === "image/png") {
    if (b.length < 33 || ascii(b, 1, 4) !== "PNG" || b[0] !== 137 || ascii(b, 12, 16) !== "IHDR" || v.getUint32(8) !== 13) throw new Error("The photo is not a valid PNG.");
    return { ...checkImageSize(v.getUint32(16), v.getUint32(20)), duration: null };
  }
  if (mime === "image/jpeg") return { ...jpeg(b, v), duration: null };
  if (mime === "image/webp") return { ...webp(b, v), duration: null };
  if (mime === "image/gif") return { ...gif(b, v), duration: null };
  if (mime === "image/avif") return { ...isoImage(b, v, "AVIF"), duration: null };
  if (mime === "image/heic" || mime === "image/heif") return { ...isoImage(b, v, "HEIC"), duration: null };
  let duration = 0, width = 0, height = 0;
  if (mime === "video/mp4" || mime === "video/quicktime") {
    const label = mime === "video/quicktime" ? "MOV" : "MP4";
    if (b.length < 24 || ascii(b, 4, 8) !== "ftyp") throw new Error("The video is not a valid " + label + ".");
    let hasMedia = false;
    const boxes = (start: number, end: number, depth: number) => {
      if (depth > 6) throw new Error("Invalid video nesting.");
      let p = start;
      while (p + 8 <= end) {
        let size = v.getUint32(p), header = 8;
        const type = ascii(b, p + 4, p + 8);
        if (size === 1) { if (p + 16 > end) throw new Error("Invalid " + label + "."); size = Number(v.getBigUint64(p + 8)); header = 16; }
        if (size === 0) size = end - p;
        if (size < header || p + size > end) throw new Error("The video is incomplete.");
        const q = p + header;
        if (type === "mdat" && size > header) hasMedia = true;
        if (["moov", "trak", "mdia"].includes(type)) boxes(q, p + size, depth + 1);
        if (type === "mvhd" && size >= header + 24) {
          const version = b[q], scalePos = q + (version === 1 ? 20 : 12);
          if (scalePos + (version === 1 ? 12 : 8) > p + size) throw new Error("Invalid video timing.");
          const scale = v.getUint32(scalePos);
          duration = (version === 1 ? Number(v.getBigUint64(scalePos + 4)) : v.getUint32(scalePos + 4)) / scale;
        }
        if (type === "tkhd" && size >= header + 84) {
          const w = v.getUint32(p + size - 8) / 65536, h = v.getUint32(p + size - 4) / 65536;
          if (w * h > width * height) { width = Math.round(w); height = Math.round(h); }
        }
        p += size;
      }
      // A tail too short to hold another box is padding, not corruption.
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
        if ([0x1a45dfa3, 0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0].includes(id.value)) elements(p, p + size, depth + 1);
        p += size;
      }
    };
    elements(0, b.length, 0); duration = ticks * scale / 1000000000;
    if (!webm || !cluster) throw new Error("The video is not a complete WebM.");
  } else throw new Error("Unsupported media type.");
  if (!Number.isFinite(duration) || duration <= 0 || duration > 300) throw new Error("Choose a video with a valid duration of five minutes or less.");
  return { ...checkVideoSize(width, height), duration };
}
