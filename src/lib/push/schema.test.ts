import { describe, expect, it } from "vitest";
import { deviceLabel, subscribeRequestSchema, unsubscribeRequestSchema } from "./schema";

const subscription = {
  endpoint: "https://push.example.com/subscription/abcdefghijklmnop",
  keys: { p256dh: "B".repeat(87), auth: "C".repeat(22) },
};

describe("subscribeRequestSchema", () => {
  it("accepts a browser subscription", () => {
    expect(subscribeRequestSchema.safeParse({ subscription }).success).toBe(true);
  });

  it("refuses an endpoint that is not https", () => {
    // The database enforces this too; failing here gives a readable message instead.
    const insecure = { ...subscription, endpoint: "http://push.example.com/subscription/abcdefghij" };
    expect(subscribeRequestSchema.safeParse({ subscription: insecure }).success).toBe(false);
  });

  it("refuses keys outside the stored bounds", () => {
    expect(subscribeRequestSchema.safeParse({ subscription: { ...subscription, keys: { ...subscription.keys, auth: "short" } } }).success).toBe(false);
    expect(subscribeRequestSchema.safeParse({ subscription: { ...subscription, keys: { ...subscription.keys, p256dh: "X".repeat(201) } } }).success).toBe(false);
  });

  it("requires an endpoint to unsubscribe", () => {
    expect(unsubscribeRequestSchema.safeParse({}).success).toBe(false);
    expect(unsubscribeRequestSchema.safeParse({ endpoint: subscription.endpoint }).success).toBe(true);
  });
});

describe("deviceLabel", () => {
  it("names the browser and platform without storing the user agent", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari on iOS");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36")).toBe("Chrome on Windows");
  });

  it("prefers the specific browser when a user agent claims several", () => {
    // Edge reports Chrome and Safari too, so ordering decides the answer.
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0")).toBe("Edge on Windows");
  });

  it("falls back rather than guessing", () => {
    expect(deviceLabel(null)).toBe("This device");
    expect(deviceLabel("something-unrecognised")).toBe("This device");
  });
});
