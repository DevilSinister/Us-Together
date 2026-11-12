"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { mutateBucket } from "@/app/actions/bucket";
import { EntryMenu } from "@/components/app/entry-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BucketItem, BucketList } from "@/lib/bucket/schema";
import { ItemEditor } from "./item-editor";

/** An idea's corner menu: Edit opens the idea editor in a dialog; Delete confirms first. */
export function IdeaMenu({ item, lists, categories }: { item: BucketItem; lists: BucketList[]; categories: readonly string[] | string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <>
      <EntryMenu
        label="Idea options"
        items={[{ kind: "action", label: "Edit idea", icon: Pencil, onSelect: () => setEditing(true) }]}
        deletion={{
          label: "Delete idea",
          title: "Delete this idea?",
          description: <>
            <strong className="font-semibold text-foreground">&ldquo;{item.title}&rdquo;</strong> and its steps leave your shared bucket list for good.
            Plans and memories made from it stay, without the link back.
          </>,
          leavesPage: true,
          onConfirm: async () => {
            const result = await mutateBucket({ operation: "deleteItem", id: item.id, version: item.version, confirmation: "DELETE" });
            if (!result.ok) return result.message;
            router.push(`/bucket/lists/${item.list_id}`);
            router.refresh();
          },
        }}
      />
      <Dialog open={editing} onOpenChange={(next) => { if (!saving) setEditing(next); }}>
        <DialogContent title="Edit bucket idea" className="max-w-2xl" dismissible={!saving}>
          <DialogHeader>
            <DialogTitle>Edit the idea</DialogTitle>
            <DialogDescription>Refine your shared plans, timing, location, or details.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ItemEditor lists={lists} item={item} categories={categories} key={item.version} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} onPendingChange={setSaving} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
