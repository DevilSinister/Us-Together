import { z } from "zod";

/**
 * Bounds mirror the push_subscriptions check constraints exactly, so a malformed
 * endpoint is refused with a readable message here rather than surfacing as a
 * database error. A subscription is browser-generated, never user-typed.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().min(20).max(2048).startsWith("https://"),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
});

export const subscribeRequestSchema = z.object({
  subscription: pushSubscriptionSchema,
  replaces: z.string().max(2048).nullish(),
  label: z.string().trim().min(1).max(80).nullish(),
});

export const unsubscribeRequestSchema = z.object({
  endpoint: z.string().min(20).max(2048),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/**
 * A short, honest device name for the subscription list. The full user agent is not
 * stored: it is a fingerprinting surface and adds nothing a person needs to tell
 * their own two devices apart.
 */
export function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return "This device";
  const platform =
    /iPhone|iPad|iPod/i.test(userAgent) ? "iOS" :
    /Android/i.test(userAgent) ? "Android" :
    /Macintosh|Mac OS/i.test(userAgent) ? "Mac" :
    /Windows/i.test(userAgent) ? "Windows" :
    /Linux/i.test(userAgent) ? "Linux" : null;
  // Chrome's UA also contains "Safari", and Edge's contains both, so order matters.
  const browser =
    /Edg\//i.test(userAgent) ? "Edge" :
    /OPR\//i.test(userAgent) ? "Opera" :
    /Firefox\//i.test(userAgent) ? "Firefox" :
    /Chrome\//i.test(userAgent) ? "Chrome" :
    /Safari\//i.test(userAgent) ? "Safari" : null;
  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? "This device";
}
