import { z } from "zod";

export const wishlistPriorities = ["nice_to_have", "want", "really_want"] as const;
export const purchaseStatuses = ["planned", "purchased", "given", "cancelled"] as const;
export type WishlistPriority = (typeof wishlistPriorities)[number];
export type PurchaseStatus = (typeof purchaseStatuses)[number];

export const priorityLabels: Record<WishlistPriority, string> = {
  nice_to_have: "Nice to have",
  want: "Want",
  really_want: "Really want",
};

export const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  planned: "Planning to buy",
  purchased: "Bought",
  given: "Given",
  cancelled: "Not going ahead",
};

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);

/** A decimal amount typed by a person becomes integer minor units. */
const money = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === "" || /^\d{1,9}([.,]\d{1,2})?$/.test(value), "Enter an amount like 129.99.")
  .transform((value) => (value === "" ? null : Math.round(Number(value.replace(",", ".")) * 100)));

export const wishlistItemInput = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, "Give this a name.").max(160),
    description: optional(4000),
    productUrl: z
      .string()
      .trim()
      .max(2048)
      .refine((value) => value === "" || /^https:\/\/\S+\.\S+/.test(value), "Use a secure https link.")
      .transform((value) => value || null),
    price: money,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .max(3)
      .refine((value) => value === "" || /^[A-Z]{3}$/.test(value), "Use a three-letter code like USD.")
      .transform((value) => value || null),
    category: optional(80),
    priority: z.enum(wishlistPriorities).default("want"),
    notes: optional(2000),
  })
  .refine((value) => value.price === null || value.currency !== null, { message: "Add a currency for this price.", path: ["currency"] })
  .refine((value) => value.currency === null || value.price !== null, { message: "Add an amount for this currency.", path: ["price"] });

export const purchaseSecretInput = z.object({
  itemId: z.uuid(),
  status: z.enum(purchaseStatuses),
  notes: optional(2000),
});

export type WishlistItemInput = z.output<typeof wishlistItemInput>;

export type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  product_url: string | null;
  price_minor: number | null;
  currency: string | null;
  category: string | null;
  priority: string;
  notes: string | null;
  owner_id: string;
  mine: boolean;
};

/** Purchaser-only state. Never attached to an item the viewer owns. */
export type PurchaseSecret = {
  id: string;
  status: string;
  notes: string | null;
  purchased_at: string | null;
};

export type WishlistView = {
  paired: boolean;
  mine: WishlistItem[];
  partner: WishlistItem[];
  /** Keyed by wishlist item id, only for items the viewer does not own. */
  secrets: Record<string, PurchaseSecret>;
  partnerName: string | null;
  error?: string;
};

export function formatPrice(minor: number | null, currency: string | null) {
  if (minor === null || !currency) return null;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export function productHost(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
