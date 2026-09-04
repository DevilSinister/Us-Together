import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { GiftPlan } from "@/components/wishlist/gift-plan";
import { DeleteWish } from "@/components/wishlist/delete-wish";
import { loadWishlistItem } from "@/lib/wishlist/data";
import { formatPrice, priorityLabels, productHost } from "@/lib/wishlist/schema";

export const metadata = { title: "Wish" };

export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await loadWishlistItem(id);
  if (!data) notFound();
  const { item, secret, partnerName } = data;
  const price = formatPrice(item.price_minor, item.currency);
  const host = productHost(item.product_url);

  return (
    <div className="mx-auto max-w-3xl reveal-on-load">
      <PageHeader
        eyebrow={item.mine ? "Your wish" : (partnerName ?? "Your partner") + " would love this"}
        title={item.title}
        back={<InlineLink href="/wishlist"><ArrowLeft className="size-4" aria-hidden="true" />Back to wishlists</InlineLink>}
        actions={item.mine ? <Button asChild variant="outline"><Link href={"/wishlist/" + item.id + "/edit"}>Edit wish</Link></Button> : null}
      />

      <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <dt className="text-sm text-muted-foreground">How much they want it</dt>
          <dd className="mt-1 font-semibold">{priorityLabels[item.priority as keyof typeof priorityLabels] ?? item.priority}</dd>
        </div>
        {price ? <div><dt className="text-sm text-muted-foreground">Roughly</dt><dd className="mt-1 font-semibold">{price}</dd></div> : null}
        {item.category ? <div><dt className="text-sm text-muted-foreground">Kind</dt><dd className="mt-1 font-semibold">{item.category}</dd></div> : null}
      </dl>

      {item.description ? <p className="mt-8 max-w-prose whitespace-pre-wrap break-words text-lg leading-8">{item.description}</p> : null}
      {item.notes ? <p className="mt-5 max-w-prose whitespace-pre-wrap break-words leading-7 text-muted-foreground">{item.notes}</p> : null}
      {host ? (
        <p className="mt-6">
          <InlineLink href={item.product_url!} target="_blank" rel="noreferrer noopener">Open {host}<ExternalLink className="size-4" aria-hidden="true" /></InlineLink>
        </p>
      ) : null}

      {item.mine ? (
        <>
          <p className="mt-10 max-w-prose rounded-panel bg-secondary p-5 text-sm leading-6 text-muted-foreground">
            Anything your partner plans around this wish is theirs alone. This page never tells you whether a gift is on its way.
          </p>
          <DeleteWish id={item.id} />
        </>
      ) : (
        <GiftPlan itemId={item.id} secret={secret} ownerName={partnerName} />
      )}
    </div>
  );
}
