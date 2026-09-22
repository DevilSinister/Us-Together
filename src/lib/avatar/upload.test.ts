import { describe, it, expect } from "vitest";
import { AVATAR_MAX_BYTES, avatarExtension, avatarObjectPath, validateAvatarFile } from "./upload";

const file = (bytes: number, type: string) => new File([new Uint8Array(bytes)], "a", { type });

describe("avatar file limits", () => {
  it("accepts the three types the bucket allows", () => {
    expect(avatarExtension("image/jpeg")).toBe("jpg");
    expect(avatarExtension("image/png")).toBe("png");
    expect(avatarExtension("image/webp")).toBe("webp");
  });

  it("refuses anything else, including formats phones produce", () => {
    expect(avatarExtension("image/heic")).toBeNull();
    expect(validateAvatarFile(file(10, "image/heic"))).toEqual({ ok: false, message: "Choose a JPG, PNG, or WebP photo." });
  });

  it("holds the 2 MB boundary exactly", () => {
    expect(validateAvatarFile(file(AVATAR_MAX_BYTES, "image/png")).ok).toBe(true);
    const over = validateAvatarFile(file(AVATAR_MAX_BYTES + 1, "image/png"));
    expect(over).toEqual({ ok: false, message: "Keep the photo under 2 MB." });
  });

  it("treats no file and an empty file as 'nothing chosen', not as an error", () => {
    expect(validateAvatarFile(undefined)).toEqual({ ok: true, empty: true });
    expect(validateAvatarFile(null)).toEqual({ ok: true, empty: true });
    expect(validateAvatarFile("not a file")).toEqual({ ok: true, empty: true });
    expect(validateAvatarFile(file(0, "image/png"))).toEqual({ ok: true, empty: true });
  });

  it("reports the type and extension for an accepted file", () => {
    expect(validateAvatarFile(file(10, "image/webp"))).toEqual({ ok: true, empty: false, mime: "image/webp", extension: "webp" });
  });
});

describe("where an avatar object lives", () => {
  it("puts both my picture and my partner's under my own user id", () => {
    // This is what keeps every read an own-folder read and leaves the bucket's
    // four policies untouched.
    expect(avatarObjectPath("u1", "me", "jpg")).toMatch(/^u1\/[0-9a-f-]{36}\.jpg$/);
    expect(avatarObjectPath("u1", "partner", "png")).toMatch(/^u1\/partner\/[0-9a-f-]{36}\.png$/);
  });
});
