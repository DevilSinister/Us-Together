import "server-only";
import { coupleContext, partnerName } from "@/lib/couple/context";
import type { PurchaseSecret, WishlistItem, WishlistView } from "./schema";

const itemColumns = "id,title,description,product_url,price_minor,currency,category,priority,notes,owner_id" as const;

/**
 * Loads both members wishlists plus the viewer purchase secrets.
 *
 * The two reads are deliberately separate. Nothing joins an item the viewer owns to a
 * secret row, and secrets are keyed only for items the viewer does not own, so no
 * owner-facing shape can ever carry gift state.
 */
export async function loadWishlist(): Promise<WishlistView> {
  const empty: WishlistView = { paired: false, mine: [], partner: [], secrets: {}, partnerName: null };
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return empty;
    if (!context.coupleId) return empty;

    const [{ data: rows, error }, { data: secretRows }, name] = await Promise.all([
      context.db.from("wishlist_items").select(itemColumns).eq("couple_id", context.coupleId).order("priority", { ascending: false }).order("id", { ascending: false }).limit(200),
      context.db.from("wishlist_purchase_secrets").select("id,status,notes,purchased_at,wishlist_item_id").eq("purchaser_id", context.userId).limit(200),
      partnerName(context),
    ]);
    if (error) throw error;

    const items: WishlistItem[] = (rows ?? []).map((row) => ({ ...row, mine: row.owner_id === context.userId }));
    const secrets: Record<string, PurchaseSecret> = {};
    for (const row of secretRows ?? []) {
      const item = items.find((candidate) => candidate.id === row.wishlist_item_id);
      if (item && !item.mine) secrets[row.wishlist_item_id] = { id: row.id, status: row.status, notes: row.notes, purchased_at: row.purchased_at };
    }

    return {
      paired: true,
      mine: items.filter((item) => item.mine),
      partner: items.filter((item) => !item.mine),
      secrets,
      partnerName: name,
    };
  } catch {
    return { ...empty, error: "We could not open your wishlists. Check your connection and try again." };
  }
}

export async function loadWishlistItem(id: string) {
  const context = await coupleContext();
  if (context.kind === "preview" || !context.coupleId) return null;
  const { data } = await context.db.from("wishlist_items").select(itemColumns).eq("id", id).maybeSingle();
  if (!data) return null;
  const mine = data.owner_id === context.userId;
  let secret: PurchaseSecret | null = null;
  if (!mine) {
    const { data: row } = await context.db
      .from("wishlist_purchase_secrets")
      .select("id,status,notes,purchased_at")
      .eq("wishlist_item_id", id)
      .eq("purchaser_id", context.userId)
      .maybeSingle();
    secret = row ?? null;
  }
  return { item: { ...data, mine } as WishlistItem, secret, partnerName: await partnerName(context) };
}
