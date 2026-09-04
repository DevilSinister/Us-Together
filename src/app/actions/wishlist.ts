"use server";
import { revalidatePath } from "next/cache";
import { coupleContext } from "@/lib/couple/context";
import { purchaseSecretInput, wishlistItemInput } from "@/lib/wishlist/schema";

type Result = { ok?: true; id?: string; error?: string; fields?: Record<string, string[]> };

function invalid(error: unknown): Result {
  if (error && typeof error === "object" && "issues" in error) {
    const fields: Record<string, string[]> = {};
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const key = String(issue.path[0] ?? "form");
      fields[key] = [...(fields[key] ?? []), issue.message];
    }
    return { error: "Check the highlighted fields.", fields };
  }
  return { error: "We could not save that. Try again." };
}

/** Only the owner may create or change a wishlist item; policy enforces it again. */
export async function saveWishlistItem(input: unknown): Promise<Result> {
  let parsed;
  try {
    parsed = wishlistItemInput.parse(input);
  } catch (error) {
    return invalid(error);
  }
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return { error: "Wishlists open with a connected account." };
    if (!context.coupleId) return { error: "Connect your partner to start a wishlist." };
    const row = {
      title: parsed.title,
      description: parsed.description,
      product_url: parsed.productUrl,
      price_minor: parsed.price,
      currency: parsed.currency,
      category: parsed.category,
      priority: parsed.priority,
      notes: parsed.notes,
    };
    if (parsed.id) {
      const { data, error } = await context.db.from("wishlist_items").update(row).eq("id", parsed.id).select("id").maybeSingle();
      if (error || !data) return { error: "Only the person who added this can change it." };
      revalidatePath("/wishlist");
      revalidatePath("/wishlist/" + parsed.id);
      return { ok: true, id: parsed.id };
    }
    const { data, error } = await context.db
      .from("wishlist_items")
      .insert({ ...row, couple_id: context.coupleId, owner_id: context.userId })
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "We could not add that. Try again." };
    revalidatePath("/wishlist");
    return { ok: true, id: data.id };
  } catch {
    return { error: "Connection interrupted. Your wishlist is unchanged." };
  }
}

export async function deleteWishlistItem(id: string): Promise<Result> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return { error: "Wishlists open with a connected account." };
    const { data, error } = await context.db.from("wishlist_items").delete().eq("id", id).select("id").maybeSingle();
    if (error || !data) return { error: "Only the person who added this can remove it." };
    revalidatePath("/wishlist");
    return { ok: true };
  } catch {
    return { error: "Connection interrupted. Try again." };
  }
}

/**
 * Purchase secrets are the phase gate. The server never accepts a purchaser from the
 * client, never touches a secret for an item the caller owns, and returns the same
 * generic message whether the target was missing or forbidden, so a wishlist owner
 * learns nothing from probing.
 */
export async function savePurchaseSecret(input: unknown): Promise<Result> {
  let parsed;
  try {
    parsed = purchaseSecretInput.parse(input);
  } catch (error) {
    return invalid(error);
  }
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return { error: "Gift plans open with a connected account." };
    const { data: item } = await context.db.from("wishlist_items").select("owner_id").eq("id", parsed.itemId).maybeSingle();
    if (!item || item.owner_id === context.userId) return { error: "This wish is not one you can plan a gift for." };
    const { error } = await context.db
      .from("wishlist_purchase_secrets")
      .upsert(
        { wishlist_item_id: parsed.itemId, purchaser_id: context.userId, status: parsed.status, notes: parsed.notes },
        { onConflict: "wishlist_item_id,purchaser_id" },
      );
    if (error) return { error: "We could not save your gift plan. Try again." };
    revalidatePath("/wishlist");
    revalidatePath("/wishlist/" + parsed.itemId);
    return { ok: true };
  } catch {
    return { error: "Connection interrupted. Your gift plan is unchanged." };
  }
}

export async function deletePurchaseSecret(itemId: string): Promise<Result> {
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return { error: "Gift plans open with a connected account." };
    const { error } = await context.db
      .from("wishlist_purchase_secrets")
      .delete()
      .eq("wishlist_item_id", itemId)
      .eq("purchaser_id", context.userId);
    if (error) return { error: "We could not clear your gift plan. Try again." };
    revalidatePath("/wishlist");
    revalidatePath("/wishlist/" + itemId);
    return { ok: true };
  } catch {
    return { error: "Connection interrupted. Try again." };
  }
}
