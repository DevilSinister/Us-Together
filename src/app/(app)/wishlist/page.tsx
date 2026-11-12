import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { GiftPlanRows, WishRows } from "@/components/wishlist/wish-rows";
import { loadWishlist } from "@/lib/wishlist/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wishlists" };

/**
 * Wishlists as a Cover screen: a band, then one list at a time behind a
 * two-way switch. The partner's list comes first, because it is the one you
 * act on; your own gift plans for it follow, seen only by you. The switch is
 * a pair of links (`?list=mine`), so each list has an address and needs no
 * client script.
 */
export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const { list } = await searchParams;
  const showMine = list === "mine";
  const view = await loadWishlist();
  const partnerLabel = view.partnerName ?? "Your partner";
  const add = <Button asChild><Link href="/wishlist/new"><Plus className="size-4" aria-hidden="true" />New wish</Link></Button>;

  return (
    <>
      <Cover labelledBy="wishlists-title" height="band" action={view.paired ? add : null}>
        <h1 id="wishlists-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">Wishlists</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">What each of you is quietly hoping for</p>
      </Cover>

      <CoverSheet>
        {view.error ? <p role="alert" className="status-message status-error">{view.error}</p> : null}

        {!view.paired && !view.error ? (
          <PairingNotice
            className="mt-0"
            title="Wishlists open with your shared space."
            body="Each wish belongs to one of you and is readable by the other, so the list waits until both accounts are connected."
          />
        ) : null}

        {view.paired ? (
          <div className="max-w-3xl">
            <nav aria-label="Whose wishes" className="grid grid-cols-2 gap-2">
              <ListLink href="/wishlist" current={!showMine}>{partnerLabel}&apos;s wishes</ListLink>
              <ListLink href="/wishlist?list=mine" current={showMine}>Your wishes</ListLink>
            </nav>
            <p className="mt-3 text-[0.8125rem] leading-5 text-muted-foreground">
              {showMine ? `${partnerLabel} can read these.` : `Open one to plan a gift. ${partnerLabel} never sees your plans.`}
            </p>

            {showMine ? (
              view.mine.length ? (
                <div className="mt-1"><WishRows items={view.mine} /></div>
              ) : (
                <EmptyState
                  className="mt-6"
                  icon={Sparkles}
                  title="Leave a hint."
                  body="One line is enough. It saves the guesswork later."
                  action={<Button asChild><Link href="/wishlist/new">Add your first wish</Link></Button>}
                />
              )
            ) : view.partner.length ? (
              <>
                <div className="mt-1"><WishRows items={view.partner} secrets={view.secrets} /></div>
                <GiftPlanRows items={view.partner} secrets={view.secrets} />
              </>
            ) : (
              <EmptyState className="mt-6" icon={Gift} title="Nothing here yet." body={partnerLabel + " has not added a wish. Their list appears here when they do."} />
            )}
          </div>
        ) : null}
      </CoverSheet>

      {view.paired ? <FloatingAction href="/wishlist/new" label="New wish" /> : null}
    </>
  );
}

function ListLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "grid min-h-11 place-items-center truncate rounded-control border px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
        current ? "border-secondary bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
