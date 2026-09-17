import { z } from "zod";

export const lockArea = z.enum(["gallery", "memories", "moments", "plans", "bucket", "notes", "drawings", "wishlist", "notifications"]);
export type LockArea = z.infer<typeof lockArea>;
export const lockAreas: { id: LockArea; label: string; detail: string }[] = [
  { id: "gallery", label: "Gallery", detail: "Photos, videos and downloads" },
  { id: "memories", label: "Memories", detail: "Memory stories and their media" },
  { id: "moments", label: "Moments", detail: "Milestones and their media" },
  { id: "plans", label: "Plans", detail: "Plans, calendar details and attachments" },
  { id: "bucket", label: "Bucket lists", detail: "Lists and their items" },
  { id: "notes", label: "Notes", detail: "Shared notes" },
  { id: "drawings", label: "Drawings", detail: "Drawings and image files" },
  { id: "wishlist", label: "Wishlists", detail: "Wishes and purchase details" },
  { id: "notifications", label: "Notifications", detail: "Activity inbox" },
];
export const pinCode = z.string().regex(/^([0-9]{4}|[0-9]{6})$/, "Use a 4- or 6-digit PIN.");
export const currentPinCode = z.string().regex(/^([0-9]{4}|[0-9]{6,12})$/, "Enter your current PIN.");
