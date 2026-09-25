"use client";
import { useRouter } from "next/navigation";
import { deleteWishlistItem } from "@/app/actions/wishlist";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

export function DeleteWish({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      label="Remove wish"
      title="Remove this wish?"
      description={<>
        <strong className="font-semibold text-foreground">“{title}”</strong> goes for both of you. Anything your partner planned around it goes with it, and they are not told why.
      </>}
      leavesPage
      onConfirm={async () => {
        const result = await deleteWishlistItem(id);
        if (result.error) return result.error;
        router.push("/wishlist");
        router.refresh();
      }}
    />
  );
}
