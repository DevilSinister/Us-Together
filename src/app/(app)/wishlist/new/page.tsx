import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { WishlistItemForm } from "@/components/wishlist/item-form";
import { loadWishlist } from "@/lib/wishlist/data";

export const metadata: Metadata = { title: "New wish" };

export default async function NewWishPage() {
  const view = await loadWishlist();
  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <PageHeader
        scale="compact"
        eyebrow="Yours to name"
        title="Add something you would love."
        lede="Your partner can read this wish. Anything they plan around it stays private to them."
        back={<InlineLink href="/wishlist"><ArrowLeft className="size-4" aria-hidden="true" />Back to wishlists</InlineLink>}
      />
      {view.paired ? <section className="mt-9"><WishlistItemForm /></section> : <PairingNotice title="Wishlists open with your shared space." />}
    </div>
  );
}
