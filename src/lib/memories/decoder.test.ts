import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Image } from "imagescript";
import { checkImageSize, inspectMedia } from "./media";
import { sharedDecoder } from "./decoder";

describe("shared photo decoder", () => {
  it("shares overlapping initialization and retries after initialization fails", async () => {
    const initialize = vi.fn().mockRejectedValueOnce(Error("Temporary outage")).mockResolvedValue("decoder");
    const getDecoder = sharedDecoder(initialize);
    const first = getDecoder();
    expect(getDecoder()).toBe(first);
    await expect(first).rejects.toThrow("Temporary outage");
    expect(await getDecoder()).toBe("decoder");
    expect(await getDecoder()).toBe("decoder");
    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it("decodes 30 real JPEG/PNG originals with one verified WASM initialization", async () => {
    const initialize = vi.fn(async () => {
      const decoder = await import("@imagemagick/magick-wasm");
      const bytes = await readFile(new URL(import.meta.resolve("@imagemagick/magick-wasm/magick.wasm")));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe("5a4ed1017eda113144c86ae839c22c610afebcfebfa22b1da18e00e98d78b0f7");
      await decoder.initializeImageMagick(bytes);
      return decoder;
    });
    const getDecoder = sharedDecoder(initialize);
    const image = new Image(1200, 800); image.fill(0x883344ff);
    const originals = [await image.encode(), await image.encodeJPEG(80)];
    for (let i = 0; i < 30; i++) {
      const { ImageMagick, MagickFormat } = await getDecoder();
      const preview = ImageMagick.read(originals[i % 2], decoded => {
        expect(checkImageSize(decoded.width, decoded.height)).toEqual({ width: 1200, height: 800 });
        decoded.autoOrient(); decoded.resize(960, 640); decoded.strip(); decoded.quality = 80;
        return decoded.write(MagickFormat.Jpeg, bytes => new Uint8Array(bytes));
      });
      expect(inspectMedia(preview, "image/jpeg")).toEqual({ width: 960, height: 640, duration: null });
    }
    expect(initialize).toHaveBeenCalledTimes(1);
  }, 30000);
});
