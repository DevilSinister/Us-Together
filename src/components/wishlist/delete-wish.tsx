"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteWishlistItem } from "@/app/actions/wishlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteWish({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  return (
    <details className="mt-12 border-t pt-5">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-danger">Remove this wish</summary>
      <p className="mt-3 max-w-prose leading-7 text-muted-foreground">
        This removes the wish for both of you. Anything your partner planned around it goes with it, and they are not told why.
      </p>
      {error ? <p role="alert" className="status-message status-error mt-4">{error}</p> : null}
      <form
        className="mt-5 max-w-sm space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await deleteWishlistItem(id);
            if (result.error) { setError(result.error); return; }
            router.push("/wishlist");
            router.refresh();
          });
        }}
      >
        <Label htmlFor="delete-wish">Type DELETE to confirm</Label>
        <Input id="delete-wish" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        <Button variant="outline" className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger" disabled={pending || confirmation !== "DELETE"}>
          Permanently remove wish
        </Button>
      </form>
    </details>
  );
}
