import Link from "next/link";
import { ChevronRight, Gift, Lock } from "lucide-react";
import { formatPrice, priorityLabels, productHost, type PurchaseSecret, type PurchaseStatus, type WishlistItem } from "@/lib/wishlist/schema";

/** How a gift plan reads to the one person who can see it. A dropped plan is not shown. */
const planWords: Partial<Record<PurchaseStatus, string>> = {
  planned: "You're planning this",
  purchased: "You've got this",
  given: "You gave this",
};

export function activePlan(secret: PurchaseSecret | undefined) {
  return secret && planWords[secret.status as PurchaseStatus] ? secret : undefined;
}

/** The quiet line over a wish: a private plan when there is one, else what it costs and where it is from. */
function kicker(item: WishlistItem, secret: PurchaseSecret | undefined) {
  if (secret) return planWords[secret.status as PurchaseStatus] + " · only you can see";
  const parts = [
    item.priority === "really_want" ? priorityLabels.really_want : null,
    formatPrice(item.price_minor, item.currency),
    item.category ?? productHost(item.product_url),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : priorityLabels[item.priority as keyof typeof priorityLabels] ?? null;
}

/**
 * Wishes as ruled rows: a round mark, a kicker over a semibold title, and a
 * chevron. A partner's wish the viewer is planning to give carries a lock and
 * says so privately; `secrets` is passed only for the partner's list, so an
 * owner's render has no branch that could show gift state.
 */
export function WishRows({ items, secrets }: { items: WishlistItem[]; secrets?: Record<string, PurchaseSecret> }) {
  return (
    <ul className="stagger divide-y divide-border">
      {items.map((item) => {
        const secret = activePlan(secrets?.[item.id]);
        const line = kicker(item, secret);
        return (
          <li key={item.id}>
            <Link
              href={"/wishlist/" + item.id}
              className="group flex min-h-[4.25rem] items-center gap-3 rounded-control py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
                {secret ? <Lock className="size-5" /> : <Gift className="size-5" />}
              </span>
              {/* The title comes first in the markup so it names the link; the kicker shows above it. */}
              <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                <span className="text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">{item.title}</span>
                {line ? <span className="truncate text-[0.8125rem] leading-5 text-muted-foreground">{line}</span> : null}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The viewer's own gift plans for the partner's wishes, still to give: planning
 * first, then bought. Only the purchaser ever reads these rows.
 */
export function GiftPlanRows({ items, secrets }: { items: WishlistItem[]; secrets: Record<string, PurchaseSecret> }) {
  const order: PurchaseStatus[] = ["planned", "purchased"];
  const plans = items
    .filter((item) => order.includes(secrets[item.id]?.status as PurchaseStatus))
    .sort((a, b) => order.indexOf(secrets[a.id].status as PurchaseStatus) - order.indexOf(secrets[b.id].status as PurchaseStatus));
  if (!plans.length) return null;
  return (
    <section aria-labelledby="gift-plans" className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="gift-plans" className="font-display text-[1.375rem] leading-[1.3]">Your gift plans</h2>
        <span className="text-[0.8125rem] text-muted-foreground">Private to you</span>
      </div>
      <ul className="mt-1 divide-y divide-border">
        {plans.map((item) => (
          <li key={item.id}>
            <Link
              href={"/wishlist/" + item.id}
              className="group flex min-h-[4.25rem] items-center gap-3 rounded-control py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground"><Lock className="size-5" /></span>
              <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                <span className="text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere] transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">{item.title}</span>
                <span className="text-[0.8125rem] leading-5 text-muted-foreground">{planWords[secrets[item.id].status as PurchaseStatus]}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
