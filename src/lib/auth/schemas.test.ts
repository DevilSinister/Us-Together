import { describe, expect, it } from "vitest";
import { pairingCodeSchema, profileSchema, relationshipSchema, signInSchema, signUpSchema, updatePasswordSchema } from "@/lib/auth/schemas";

describe("authentication schemas", () => {
  it("accepts a valid sign-in payload", () => {
    expect(signInSchema.safeParse({ email: "alex@example.com", password: "anything" }).success).toBe(true);
  });

  it("rejects a weak signup password", () => {
    const result = signUpSchema.safeParse({ email: "alex@example.com", password: "alllowercase1", confirmPassword: "alllowercase1" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const result = signUpSchema.safeParse({ email: "alex@example.com", password: "StrongEnough1", confirmPassword: "StrongEnough2" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid password update", () => {
    expect(updatePasswordSchema.safeParse({ password: "StrongEnough1", confirmPassword: "StrongEnough1" }).success).toBe(true);
  });
});

describe("onboarding schemas", () => {
  it("accepts an optional relationship date", () => {
    expect(relationshipSchema.safeParse({ relationshipStartedOn: "2024-01-01" }).success).toBe(true);
    expect(relationshipSchema.safeParse({ relationshipStartedOn: "" }).success).toBe(true);
  });

  it("requires a six-digit pairing code", () => {
    expect(pairingCodeSchema.safeParse({ pairingCode: "123456" }).success).toBe(true);
    expect(pairingCodeSchema.safeParse({ pairingCode: "12345" }).success).toBe(false);
  });
});

describe("profile schema", () => {
  it("trims a valid profile", () => {
    expect(profileSchema.parse({ displayName: "  Alex  ", timezone: "Asia/Karachi" })).toEqual({ displayName: "Alex", timezone: "Asia/Karachi" });
  });

  it("rejects an empty name", () => {
    expect(profileSchema.safeParse({ displayName: "  ", timezone: "UTC" }).success).toBe(false);
  });

  it("rejects an invalid timezone", () => {
    expect(profileSchema.safeParse({ displayName: "Alex", timezone: "Somewhere/Imaginary" }).success).toBe(false);
  });
});
