"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListFilter } from "lucide-react";
import { mutateBucket } from "@/app/actions/bucket";
import {
  DEFAULT_BUCKET_CATEGORIES,
  bucketPriorities,
  bucketStatuses,
  type BucketItem,
  type BucketList,
} from "@/lib/bucket/schema";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bucketFieldClass, bucketLabel } from "./bucket-workspace";

export function ItemEditor({
  lists,
  item,
  defaultListId,
  categories = DEFAULT_BUCKET_CATEGORIES,
  onSaved,
  onCancel,
  onPendingChange,
}: {
  lists: BucketList[];
  item?: BucketItem;
  defaultListId?: string;
  categories?: readonly string[] | string[];
  onSaved?: () => void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {

  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  // Category state
  const initialCategory = item?.category ?? "";
  const allCategories = Array.from(
    new Set([...categories, ...(initialCategory ? [initialCategory] : [])])
  ).filter(Boolean);

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [customCategory, setCustomCategory] = useState("");

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const values = Object.fromEntries(formData);

        // Ensure effective category is passed
        const finalCategory = isCustomCategory ? customCategory.trim() : (values.category as string || "");
        values.category = finalCategory;

        start(async () => {
          onPendingChange?.(true);
          setMessage("");
          try {
            const result = await mutateBucket({
              operation: item ? "updateItem" : "createItem",
              id: item?.id,
              version: item?.version,
              item: values,
            });
            setMessage(result.message);
            if (result.ok) {
              if (onSaved) {
                onSaved();
              }
              if (!item) {
                router.push(`/bucket/${result.id}`);
              } else {
                router.refresh();
              }
            }
          } catch {
            setMessage("Connection interrupted. Your form is kept here; check your ideas before retrying.");
          } finally {
            onPendingChange?.(false);
          }
        });
      }}
    >
      <label className="block space-y-2 font-semibold">
        What would you love to do?
        <Input name="title" required maxLength={160} defaultValue={item?.title} placeholder="e.g. Watch the sunrise together" />
      </label>

      <div className="grid items-start gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          List
          <select
            aria-label="List"
            name="listId"
            className={bucketFieldClass}
            defaultValue={item?.list_id ?? defaultListId ?? lists[0]?.id}
            required
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <span className="text-sm font-semibold">Category <span className="font-normal text-muted-foreground">optional</span></span>
            <button
              type="button"
              onClick={() => {
                setIsCustomCategory(!isCustomCategory);
              }}
              disabled={pending}
              className="-my-3 inline-flex min-h-11 shrink-0 items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {isCustomCategory ? (
                <>
                  <ListFilter className="size-3.5" />
                  Choose existing
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Add category
                </>
              )}
            </button>
          </div>

          {isCustomCategory ? (
            <Input
              name="category"
              aria-label="Category"
              maxLength={80}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="New category name…"
              autoFocus
            />
          ) : (
            <select
              aria-label="Category"
              name="category"
              className={bucketFieldClass}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">No category</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <label className="block space-y-2 text-sm font-semibold">
        Why this one? <span className="font-normal text-muted-foreground">optional</span>
        <textarea
          name="description"
          aria-label="Why this one?"
          rows={3}
          maxLength={4000}
          className={bucketFieldClass}
          defaultValue={item?.description ?? ""}
          placeholder="Why does this matter to both of you?"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          Priority
          <select
            aria-label="Priority"
            name="priority"
            className={bucketFieldClass}
            defaultValue={item?.priority ?? "medium"}
          >
            {bucketPriorities.map((value) => (
              <option key={value} value={value}>
                {bucketLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold">
          Status
          <select
            aria-label="Status"
            name="status"
            className={bucketFieldClass}
            defaultValue={item?.status ?? "idea"}
          >
            {bucketStatuses.map((value) => (
              <option key={value} value={value}>
                {bucketLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold">
          Target date <span className="font-normal text-muted-foreground">optional</span>
          <Input name="targetDate" aria-label="Target date" type="date" defaultValue={item?.target_date ?? ""} />
        </label>

        <label className="space-y-2 text-sm font-semibold">
          Location <span className="font-normal text-muted-foreground">optional</span>
          <Input name="location" aria-label="Location" maxLength={240} defaultValue={item?.location ?? ""} placeholder="City, spot, or home" />
        </label>
      </div>

      <fieldset>
        <legend className="font-display text-xl">
          Estimated cost <span className="font-sans text-sm font-normal text-muted-foreground">optional</span>
        </legend>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <label className="space-y-2 text-sm font-semibold">
            Amount
            <Input
              name="cost"
              aria-label="Cost amount"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={item?.estimated_cost_minor != null ? (item.estimated_cost_minor / 100).toFixed(2) : ""}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            Currency
            <Input name="currency" aria-label="Currency" maxLength={3} placeholder="USD" defaultValue={item?.currency ?? ""} />
          </label>
        </div>
      </fieldset>

      <p role="status" className={message ? "text-sm leading-6 text-primary" : "sr-only"}>
        {message}
      </p>

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
        {onCancel ? <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>Cancel</Button> : null}
        <Button disabled={pending || !lists.length} className="flex-1 sm:flex-none">
          {pending ? "Saving…" : item ? "Save changes" : "Save this idea"}
        </Button>
      </div>
    </form>
  );
}
