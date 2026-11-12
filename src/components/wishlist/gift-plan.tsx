"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Gift, Lock } from "lucide-react";
import { deletePurchaseSecret, savePurchaseSecret } from "@/app/actions/wishlist";
import type { PurchaseSecret, PurchaseStatus } from "@/lib/wishlist/schema";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Label } from "@/components/ui/label";

const fieldClass = "min-h-24 w-full rounded-control border border-border bg-field px-4 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

/** Each step of a plan: what it says, the one step forward, and where Undo goes back to. */
const steps: Record<"planned" | "purchased" | "given", { title: string; next?: { label: string; status: PurchaseStatus }; back: PurchaseStatus | null }> = {
  planned: { title: "You're planning this.", next: { label: "I've got it", status: "purchased" }, back: null },
  purchased: { title: "You've got this.", next: { label: "I've given it", status: "given" }, back: "planned" },
  given: { title: "You gave this.", back: "purchased" },
};

/**
 * Shown only on a wish the viewer does not own. A plan moves one tap at a time,
 * planning, then got it, then given, and Undo steps back one. The panel states
 * its own privacy in words, because the guarantee is the feature: the owner has
 * no query, count or notification that reveals any of this. A plan marked
 * "Not going ahead" before this design reads as no plan, and keeps its note.
 */
export function GiftPlan({ itemId, secret, ownerName }: { itemId: string; secret: PurchaseSecret | null; ownerName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const step = secret && secret.status in steps ? steps[secret.status as keyof typeof steps] : null;
  const notes = secret?.notes ?? "";

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    start(async () => {
      setMessage("");
      const result = await action();
      if (result.error) { setMessage(result.error); return; }
      after?.();
      router.refresh();
    });
  }
  const move = (status: PurchaseStatus) => run(() => savePurchaseSecret({ itemId, status, notes }));
  const quiet = "min-h-11 rounded-control border border-border bg-transparent px-3.5 text-sm font-semibold text-foreground hover:bg-background/40";

  return (
    <section aria-labelledby={"gift-" + itemId} aria-busy={pending} className="flex gap-3 rounded-panel bg-secondary p-4">
      {step ? <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /> : <Gift className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={"gift-" + itemId} className="text-[1.0625rem] font-semibold leading-snug">{step ? step.title : "Giving this?"}</h2>
        <p className="text-sm leading-6 text-foreground/85">Only you can see this. {ownerName} still sees an ordinary wish.</p>
        {secret?.purchased_at && step && secret.status !== "planned" ? (
          <p className="text-[0.8125rem] text-muted-foreground">Got on {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(secret.purchased_at))}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          {step ? (
            <>
              {step.next ? <Button type="button" variant="outline" className={quiet} disabled={pending} onClick={() => move(step.next!.status)}>{step.next.label}</Button> : null}
              {step.back ? (
                <Button type="button" variant="outline" className={quiet} disabled={pending} onClick={() => move(step.back!)}>Undo</Button>
              ) : notes ? (
                <ConfirmDelete
                  variant="ghost"
                  className={quiet}
                  label="Undo"
                  title="Drop this gift plan?"
                  description="Your private note for this wish goes with it. Your partner never saw it, and still won't."
                  onConfirm={async () => {
                    const result = await deletePurchaseSecret(itemId);
                    if (result.error) return result.error;
                    router.refresh();
                  }}
                />
              ) : (
                <Button type="button" variant="outline" className={quiet} disabled={pending} onClick={() => run(() => deletePurchaseSecret(itemId))}>Undo</Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className={quiet} disabled={pending} onClick={() => move("planned")}>I&apos;m planning this</Button>
              <Button type="button" variant="outline" className={quiet} disabled={pending} onClick={() => move("purchased")}>I&apos;ve got it</Button>
            </>
          )}
        </div>

        {step ? (
          editing ? (
            <form
              method="post"
              className="mt-3 flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                run(() => savePurchaseSecret({ itemId, status: secret!.status, notes: String(data.get("notes") ?? "") }), () => setEditing(false));
              }}
            >
              <Label htmlFor={"secret-notes-" + itemId}>Private note</Label>
              <textarea id={"secret-notes-" + itemId} name="notes" rows={3} maxLength={2000} className={fieldClass} defaultValue={notes} placeholder="Ordered in navy, arrives Thursday." autoFocus />
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending}>{pending ? "Saving…" : "Save note"}</Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : notes ? (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[0.8125rem] text-muted-foreground">Your private note</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{notes}</p>
              <button type="button" onClick={() => setEditing(true)} className="mt-1 inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Edit note</button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center self-start rounded-control text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Add a private note</button>
          )
        ) : null}

        {message ? <p role="alert" className="status-message status-error mt-2">{message}</p> : null}
      </div>
    </section>
  );
}
