import Link from "next/link";
import { CreditCard, EyeOff, Heart, Link2, Pencil, Tag } from "lucide-react";
import { Cover, CoverSheet } from "@/components/app/cover";
import { EntryActions } from "@/components/app/entry-actions";
import { Button } from "@/components/ui/button";
import { DeleteWish } from "@/components/wishlist/delete-wish";
import { GiftPlan } from "@/components/wishlist/gift-plan";
import { formatPrice, priorityLabels, productHost, type PurchaseSecret, type WishlistItem } from "@/lib/wishlist/schema";

/**
 * One wish as a Cover screen. The band says whose wish it is, with the title
 * and a round way back to the list it came from. The sheet gives the facts as
 * quiet lines (how much it is wanted, the price, the kind or shop, the saved
 * link), then the wish's own words. On the partner's wish the viewer's private
 * gift plan follows; on your own wish a line says plans are hidden from you,
 * and Edit and Remove sit at the foot.
 */
export function WishView({ item, secret, partnerName }: { item: WishlistItem; secret: PurchaseSecret | null; partnerName: string | null }) {
  const partner = partnerName ?? "Your partner";
  const owner = item.mine ? "Your" : partner + "'s";
  const price = formatPrice(item.price_minor, item.currency);
  const host = productHost(item.product_url);
  const priority = priorityLabels[item.priority as keyof typeof priorityLabels] ?? null;

  return (
    <>
      <Cover labelledBy="wish-title" height="band" back={{ href: item.mine ? "/wishlist?list=mine" : "/wishlist", label: "Back to wishlists" }}>
        <p className="text-[0.8125rem] font-semibold text-primary">{owner} wish</p>
        <h1 id="wish-title" className="mt-1.5 text-balance break-words font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">{item.title}</h1>
      </Cover>

      <CoverSheet className="max-w-2xl">
        <div className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2.5 text-[0.9375rem]">
            {priority ? <Fact icon={Heart}>{priority}</Fact> : null}
            {price ? <Fact icon={CreditCard}>{price}</Fact> : null}
            {item.category ? <Fact icon={Tag}>{item.category}</Fact> : null}
            {host ? (
              <li>
                <a
                  href={item.product_url!}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-control font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Link2 className="size-4 shrink-0" aria-hidden="true" />
                  <span>Open the link {item.mine ? "you" : partner} saved <span className="font-normal text-muted-foreground">· {host}</span></span>
                </a>
              </li>
            ) : null}
          </ul>

          {item.description ? <p className="max-w-prose whitespace-pre-wrap break-words text-base leading-[1.7] text-foreground/90">{item.description}</p> : null}

          {item.notes ? (
            <div className="flex flex-col gap-1">
              <span className="text-[0.8125rem] text-muted-foreground">{owner} note</span>
              <p className="max-w-prose whitespace-pre-wrap break-words text-base leading-[1.7] text-foreground/90">{item.notes}</p>
            </div>
          ) : null}

          {item.mine ? (
            <>
              <p className="flex gap-3 rounded-panel bg-secondary p-4 text-sm leading-6 text-muted-foreground">
                <EyeOff className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                Anything {partner} plans around this wish is theirs alone. This page never tells you whether a gift is on its way.
              </p>
              <EntryActions label="Change this wish">
                <Button asChild variant="outline"><Link href={"/wishlist/" + item.id + "/edit"}><Pencil className="size-4" aria-hidden="true" />Edit wish</Link></Button>
                <DeleteWish id={item.id} title={item.title} />
              </EntryActions>
            </>
          ) : (
            <GiftPlan itemId={item.id} secret={secret} ownerName={partner} />
          )}
        </div>
      </CoverSheet>
    </>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Heart; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}
