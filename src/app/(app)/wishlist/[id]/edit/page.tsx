import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { WishlistItemForm } from "@/components/wishlist/item-form";
import { loadWishlistItem } from "@/lib/wishlist/data";

export const metadata = { title: "Edit wish" };

export default async function EditWishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await loadWishlistItem(id);
  if (!data || !data.item.mine) notFound();

  return (
    <div className="mx-auto max-w-2xl reveal-on-load">
      <PageHeader
        scale="compact"
        eyebrow="Your wish"
        title="Change the details."
        back={<InlineLink href={"/wishlist/" + id}><ArrowLeft className="size-4" aria-hidden="true" />Back to this wish</InlineLink>}
      />
      <section className="mt-9"><WishlistItemForm item={data.item} /></section>
    </div>
  );
}
