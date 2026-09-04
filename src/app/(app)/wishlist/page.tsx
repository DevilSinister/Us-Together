import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { loadWishlist } from "@/lib/wishlist/data";

export const metadata: Metadata = { title: "Wishlists" };

export default async function WishlistPage() {
  const view = await loadWishlist();
  const partnerLabel = view.partnerName ?? "Your partner";

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="Hints, kept gently"
        title="What you would each love."
        lede="Add the things you would like. Your partner can see your list, and quietly plan around it."
        actions={view.paired ? <Button asChild><Link href="/wishlist/new">Add a wish</Link></Button> : null}
      />

      {view.error ? <p role="alert" className="status-message status-error mt-8">{view.error}</p> : null}

      {!view.paired && !view.error ? (
        <PairingNotice
          title="Wishlists open with your shared space."
          body="Each wish belongs to one of you and is readable by the other, so the list waits until both accounts are connected."
        />
      ) : null}

      {view.paired ? (
        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <section aria-labelledby="my-wishes">
            <h2 id="my-wishes" className="font-display text-3xl">Yours</h2>
            <p className="mt-2 text-sm text-muted-foreground">{partnerLabel} can read these.</p>
            {view.mine.length ? (
              <div className="mt-6 space-y-8">{view.mine.map((item) => <WishlistCard key={item.id} item={item} />)}</div>
            ) : (
              <EmptyState
                className="mt-8"
                icon={Sparkles}
                title="Leave a hint."
                body="One line is enough. It saves the guesswork later."
                action={<Button asChild><Link href="/wishlist/new">Add your first wish</Link></Button>}
              />
            )}
          </section>

          <section aria-labelledby="their-wishes">
            <h2 id="their-wishes" className="font-display text-3xl">{partnerLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Open a wish to plan a gift privately.</p>
            {view.partner.length ? (
              <div className="mt-6 space-y-8">{view.partner.map((item) => <WishlistCard key={item.id} item={item} secret={view.secrets[item.id]} />)}</div>
            ) : (
              <EmptyState className="mt-8" icon={Gift} title="Nothing here yet." body={partnerLabel + " has not added a wish. Their list appears here when they do."} />
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
