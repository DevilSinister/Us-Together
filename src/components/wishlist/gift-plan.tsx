"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EyeOff, Gift } from "lucide-react";
import { deletePurchaseSecret, savePurchaseSecret } from "@/app/actions/wishlist";
import { purchaseStatusLabels, purchaseStatuses, type PurchaseSecret } from "@/lib/wishlist/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const fieldClass = "min-h-12 w-full rounded-control border border-border bg-field px-4 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

/**
 * Shown only on a wish the viewer does not own. The panel states its own privacy in
 * words, because the guarantee is the feature: the owner has no query, count or
 * notification that reveals any of this.
 */
export function GiftPlan({ itemId, secret, ownerName }: { itemId: string; secret: PurchaseSecret | null; ownerName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(Boolean(secret));
  const [message, setMessage] = useState("");

  function run(action: () => Promise<{ error?: string }>) {
    start(async () => {
      setMessage("");
      const result = await action();
      if (result.error) { setMessage(result.error); return; }
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-panel border border-dashed border-border bg-card/60 p-5 sm:p-6" aria-labelledby={"gift-" + itemId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <Gift className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h3 id={"gift-" + itemId} className="font-display text-2xl">Your gift plan</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm leading-6 text-muted-foreground">
              <EyeOff className="mt-1 size-4 shrink-0" aria-hidden="true" />
              Only you can see this. {ownerName ?? "Your partner"} has no way to tell whether a plan exists.
            </p>
          </div>
        </div>
        {secret ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{purchaseStatusLabels[secret.status as keyof typeof purchaseStatusLabels] ?? secret.status}</span> : null}
      </div>

      {open ? (
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(() => savePurchaseSecret({ itemId, status: String(data.get("status") ?? "planned"), notes: String(data.get("notes") ?? "") }));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={"status-" + itemId}>Where you are</Label>
            <select id={"status-" + itemId} name="status" className={fieldClass} defaultValue={secret?.status ?? "planned"}>
              {purchaseStatuses.map((value) => <option key={value} value={value}>{purchaseStatusLabels[value]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={"secret-notes-" + itemId}>Private notes <span className="font-normal text-muted-foreground">optional</span></Label>
            <textarea id={"secret-notes-" + itemId} name="notes" rows={3} className={fieldClass} defaultValue={secret?.notes ?? ""} placeholder="Ordered in navy, arrives Thursday." />
          </div>
          {secret?.purchased_at ? <p className="text-sm text-muted-foreground">Marked bought on {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(secret.purchased_at))}.</p> : null}
          {message ? <p role="alert" className="status-message status-error">{message}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending}>{pending ? "Saving..." : "Save gift plan"}</Button>
            {secret ? (
              <Button type="button" variant="ghost" disabled={pending} className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => run(() => deletePurchaseSecret(itemId))}>
                Clear plan
              </Button>
            ) : (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Not now</Button>
            )}
          </div>
        </form>
      ) : (
        <Button variant="outline" className="mt-5" onClick={() => setOpen(true)}>Plan a gift privately</Button>
      )}
    </section>
  );
}
