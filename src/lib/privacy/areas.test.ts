import { describe, expect, it } from "vitest";
import { currentPinCode, pinCode } from "./areas";

describe("privacy PIN boundary", () => {
  it("accepts new four- and six-digit PINs only", () => {
    expect(pinCode.safeParse("1234").success).toBe(true);
    expect(pinCode.safeParse("123456").success).toBe(true);
    for (const invalid of ["123", "12345", "1234567", "12a4", "1234 "]) {
      expect(pinCode.safeParse(invalid).success).toBe(false);
    }
  });

  it("lets existing longer codes authenticate during migration", () => {
    expect(currentPinCode.safeParse("12345678").success).toBe(true);
    expect(currentPinCode.safeParse("12345").success).toBe(false);
  });
});
