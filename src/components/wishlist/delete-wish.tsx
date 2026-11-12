"use client";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { deleteWishlistItem } from "@/app/actions/wishlist";
import { EntryMenu } from "@/components/app/entry-menu";

/** The corner menu on your own wish: Edit, and Remove behind its confirmation. */
export function WishMenu({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <EntryMenu
      label="Wish options"
      items={[{ kind: "link", label: "Edit wish", href: "/wishlist/" + id + "/edit", icon: Pencil }]}
      deletion={{
        label: "Remove wish",
        title: "Remove this wish?",
        description: <>
          <strong className="font-semibold text-foreground">“{title}”</strong> goes for both of you. Anything your partner planned around it goes with it, and they are not told why.
        </>,
        leavesPage: true,
        onConfirm: async () => {
          const result = await deleteWishlistItem(id);
          if (result.error) return result.error;
          router.push("/wishlist");
          router.refresh();
        },
      }}
    />
  );
}
