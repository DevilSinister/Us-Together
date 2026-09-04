import { describe, expect, it } from "vitest";
import { formatPrice, productHost, purchaseSecretInput, wishlistItemInput } from "./schema";

const base = { title: "A winter coat", description: "", productUrl: "", price: "", currency: "", category: "", priority: "want" as const, notes: "" };

describe("wishlist item input", () => {
  it("keeps a minimal wish and drops empty optional fields to null", () => {
    const parsed = wishlistItemInput.parse(base);
    expect(parsed.title).toBe("A winter coat");
    expect(parsed.description).toBeNull();
    expect(parsed.productUrl).toBeNull();
    expect(parsed.price).toBeNull();
    expect(parsed.currency).toBeNull();
    expect(parsed.priority).toBe("want");
  });

  it("converts a decimal amount to integer minor units", () => {
    expect(wishlistItemInput.parse({ ...base, price: "129.99", currency: "usd" }).price).toBe(12999);
    expect(wishlistItemInput.parse({ ...base, price: "40", currency: "GBP" }).price).toBe(4000);
    expect(wishlistItemInput.parse({ ...base, price: "129,50", currency: "EUR" }).price).toBe(12950);
  });

  it("upper-cases the currency code", () => {
    expect(wishlistItemInput.parse({ ...base, price: "10.00", currency: "eur" }).currency).toBe("EUR");
  });

  it("requires a price and a currency together", () => {
    expect(wishlistItemInput.safeParse({ ...base, price: "10.00" }).success).toBe(false);
    expect(wishlistItemInput.safeParse({ ...base, currency: "USD" }).success).toBe(false);
  });

  it("rejects an amount with too much precision or stray text", () => {
    expect(wishlistItemInput.safeParse({ ...base, price: "10.999", currency: "USD" }).success).toBe(false);
    expect(wishlistItemInput.safeParse({ ...base, price: "ten", currency: "USD" }).success).toBe(false);
  });

  it("accepts only a secure product link", () => {
    expect(wishlistItemInput.parse({ ...base, productUrl: "https://shop.example/coat" }).productUrl).toBe("https://shop.example/coat");
    expect(wishlistItemInput.safeParse({ ...base, productUrl: "http://shop.example/coat" }).success).toBe(false);
    expect(wishlistItemInput.safeParse({ ...base, productUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(wishlistItemInput.safeParse({ ...base, title: "   " }).success).toBe(false);
  });

  it("rejects a priority outside the documented set", () => {
    expect(wishlistItemInput.safeParse({ ...base, priority: "dream" }).success).toBe(false);
  });
});

describe("purchase secret input", () => {
  it("accepts a documented status and normalises empty notes", () => {
    const parsed = purchaseSecretInput.parse({ itemId: "0197a0e1-0000-4000-8000-000000000001", status: "purchased", notes: "  " });
    expect(parsed.status).toBe("purchased");
    expect(parsed.notes).toBeNull();
  });

  it("never accepts a purchaser from the caller", () => {
    const parsed = purchaseSecretInput.parse({ itemId: "0197a0e1-0000-4000-8000-000000000001", status: "planned", notes: "", purchaserId: "0197a0e1-0000-4000-8000-000000000009" });
    expect("purchaserId" in parsed).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(purchaseSecretInput.safeParse({ itemId: "0197a0e1-0000-4000-8000-000000000001", status: "wrapped", notes: "" }).success).toBe(false);
  });
});

describe("wishlist presentation", () => {
  it("formats money from minor units", () => {
    expect(formatPrice(12999, "USD")).toContain("129.99");
    expect(formatPrice(null, "USD")).toBeNull();
    expect(formatPrice(12999, null)).toBeNull();
    // Any well-formed code formats; the separator may be a non-breaking space.
    expect(formatPrice(1000, "ZZZ")).toMatch(/ZZZ\s10\.00/);
  });

  it("falls back to a plain amount when the code is malformed", () => {
    expect(formatPrice(1000, "US")).toBe("US 10.00");
  });

  it("shows only the host of a product link", () => {
    expect(productHost("https://www.shop.example/a/b?c=d")).toBe("shop.example");
    expect(productHost(null)).toBeNull();
    expect(productHost("not a url")).toBeNull();
  });
});
