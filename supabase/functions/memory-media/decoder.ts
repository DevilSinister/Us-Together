import { sharedDecoder } from "../../../src/lib/memories/decoder.ts";

// Keep only the initialized module, not uploaded bytes, in worker-global state.
export const getDecoder = sharedDecoder(async () => {
  const decoder = await import("npm:@imagemagick/magick-wasm@0.0.43");
  let bytes: Uint8Array;
  try {
    bytes = await Deno.readFile(new URL(import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.43/magick.wasm")));
  } catch {
    // Connector bundles may omit npm binary assets. Fetch only the pinned decoder.
    const asset = await fetch("https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.43/dist/x86/magick.wasm");
    if (!asset.ok) throw new Error("Could not create the photo preview. Try again shortly.");
    bytes = new Uint8Array(await asset.arrayBuffer());
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  if (hash !== "5a4ed1017eda113144c86ae839c22c610afebcfebfa22b1da18e00e98d78b0f7")
    throw new Error("Could not create the photo preview. Decoder integrity check failed.");
  await decoder.initializeImageMagick(bytes);
  return decoder;
});
