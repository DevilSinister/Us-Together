import { describe, it, expect } from "vitest";
import { avatarSrc, resolveMe, resolvePartner, needsPairingConfirmation } from "./resolve";

describe("my own identity", () => {
  it("uses my name, my picture and my colour", () => {
    expect(resolveMe({ display_name: "Alex", avatar_path: "u1/a.jpg", avatar_style: "wine" }))
      .toEqual({ name: "Alex", src: avatarSrc("me", "u1/a.jpg"), style: "wine" });
  });

  it("falls back without a profile, and never invents a picture", () => {
    expect(resolveMe(null)).toEqual({ name: "You", src: null, style: "rose" });
    expect(resolveMe({ display_name: "  ", avatar_path: null, avatar_style: "nonsense" }))
      .toEqual({ name: "You", src: null, style: "rose" });
  });
});

describe("how my partner appears to me", () => {
  it("prefers the name and picture I chose", () => {
    const resolved = resolvePartner(
      { display_name: "Mo", avatar_path: "u1/partner/x.jpg", avatar_style: "plum" },
      { display_name: "Mohammed" },
    );
    expect(resolved).toEqual({ name: "Mo", src: avatarSrc("partner", "u1/partner/x.jpg"), style: "plum" });
  });

  it("falls back to their own display name when I set none", () => {
    expect(resolvePartner(null, { display_name: "Mohammed" }).name).toBe("Mohammed");
    expect(resolvePartner({ display_name: "  ", avatar_path: null, avatar_style: "rose" }, { display_name: "Mohammed" }).name)
      .toBe("Mohammed");
  });

  it("says 'Your partner' when neither side has a name, including before pairing", () => {
    expect(resolvePartner(null, null).name).toBe("Your partner");
  });

  // The load-bearing assertion of the whole feature.
  it("NEVER reaches for the partner's own picture", () => {
    const resolved = resolvePartner(
      { display_name: "Mo", avatar_path: null, avatar_style: "rose" },
      { display_name: "Mohammed", avatar_path: "u2/theirs.jpg" },
    );
    expect(resolved.src).toBeNull();
    // Reading it would need a cross-account storage policy that does not exist.
    expect(resolvePartner(null, { display_name: "Mohammed", avatar_path: "u2/theirs.jpg" }).src).toBeNull();
  });

  it("keeps my picture even when I left their name to fall through", () => {
    const resolved = resolvePartner(
      { display_name: null, avatar_path: "u1/partner/x.jpg", avatar_style: "blush" },
      { display_name: "Mohammed" },
    );
    expect(resolved).toEqual({ name: "Mohammed", src: avatarSrc("partner", "u1/partner/x.jpg"), style: "blush" });
  });
});

describe("avatar addresses", () => {
  it("changes the moment the stored picture changes, so a new face is never cached behind an old URL", () => {
    const first = avatarSrc("partner", "u1/partner/aaa.jpg");
    expect(first).toMatch(/^\/api\/avatar\/partner\?v=[0-9a-z]+$/);
    expect(avatarSrc("partner", "u1/partner/aaa.jpg")).toBe(first);
    expect(avatarSrc("partner", "u1/partner/bbb.jpg")).not.toBe(first);
  });

  it("never puts the storage path, which carries a user id, into the page", () => {
    expect(avatarSrc("me", "user-123/photo.jpg")).not.toContain("user-123");
    expect(avatarSrc("me", null)).toBeNull();
  });
});

describe("confirming a name after pairing", () => {
  const named = (confirmed_couple_id: string | null) => ({ display_name: "Mo", confirmed_couple_id });

  it("asks when a name was set against a different couple", () => {
    expect(needsPairingConfirmation(named("couple-1"), "couple-2")).toBe(true);
  });

  it("asks once for a name set before there was any couple", () => {
    expect(needsPairingConfirmation(named(null), "couple-1")).toBe(true);
  });

  it("stays quiet once confirmed against the active couple", () => {
    expect(needsPairingConfirmation(named("couple-1"), "couple-1")).toBe(false);
  });

  it("stays quiet with no name to question, and while unpaired", () => {
    expect(needsPairingConfirmation({ display_name: null, confirmed_couple_id: null }, "couple-1")).toBe(false);
    expect(needsPairingConfirmation(named(null), null)).toBe(false);
  });
});
