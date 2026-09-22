import { describe, it, expect } from "vitest";
import { resolveMe, resolvePartner, needsPairingConfirmation } from "./resolve";

describe("my own identity", () => {
  it("uses my name, my picture and my colour", () => {
    expect(resolveMe({ display_name: "Alex", avatar_path: "u1/a.jpg", avatar_style: "wine" }))
      .toEqual({ name: "Alex", src: "/api/avatar/me", style: "wine" });
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
    expect(resolved).toEqual({ name: "Mo", src: "/api/avatar/partner", style: "plum" });
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
    expect(resolved).toEqual({ name: "Mohammed", src: "/api/avatar/partner", style: "blush" });
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
