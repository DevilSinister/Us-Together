import { notFound } from "next/navigation";
import { z } from "zod";
import { WishView } from "@/components/wishlist/wish-view";
import { loadWishlistItem } from "@/lib/wishlist/data";

export const metadata = { title: "Wish" };

export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await loadWishlistItem(id);
  if (!data) notFound();
  return <WishView item={data.item} secret={data.secret} partnerName={data.partnerName} />;
}
