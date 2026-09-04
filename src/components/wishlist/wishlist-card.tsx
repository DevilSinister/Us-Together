import Link from "next/link";
import { ExternalLink, Gift } from "lucide-react";
import { InlineLink } from "@/components/ui/inline-link";
import { formatPrice, priorityLabels, productHost, type WishlistItem, type PurchaseSecret } from "@/lib/wishlist/schema";

/**
 * One wish. `secret` is passed only for a wish the viewer does not own, so an owner
 * render has no branch that could leak gift state.
 */
export function WishlistCard({ item, secret }: { item: WishlistItem; secret?: PurchaseSecret }) {
  const price = formatPrice(item.price_minor, item.currency);
  const host = productHost(item.product_url);
  return (
    <article className="min-w-0 border-b pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-primary">{priorityLabels[item.priority as keyof typeof priorityLabels] ?? item.priority}</span>
        {secret ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            <Gift className="size-3.5" aria-hidden="true" />Gift planned
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 break-words font-display text-2xl sm:text-3xl">
        <Link href={"/wishlist/" + item.id} className="underline-offset-4 hover:text-primary hover:underline">{item.title}</Link>
      </h3>
      {item.description ? <p className="mt-3 line-clamp-3 break-words leading-7 text-muted-foreground">{item.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
        {price ? <span className="font-semibold text-foreground">{price}</span> : null}
        {item.category ? <span>{item.category}</span> : null}
      </div>
      {host ? (
        <InlineLink href={item.product_url!} target="_blank" rel="noreferrer noopener" className="mt-2">
          {host}<ExternalLink className="size-4" aria-hidden="true" />
        </InlineLink>
      ) : null}
    </article>
  );
}
