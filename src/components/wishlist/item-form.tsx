"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { saveWishlistItem } from "@/app/actions/wishlist";
import { priorityLabels, wishlistPriorities, type WishlistItem } from "@/lib/wishlist/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass = "min-h-12 w-full rounded-control border border-border bg-field px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/25";

export function WishlistItemForm({ item }: { item?: WishlistItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    start(async () => {
      setMessage("");
      setFields({});
      const result = await saveWishlistItem({
        id: item?.id,
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        productUrl: String(data.get("productUrl") ?? ""),
        price: String(data.get("price") ?? ""),
        currency: String(data.get("currency") ?? ""),
        category: String(data.get("category") ?? ""),
        priority: String(data.get("priority") ?? "want"),
        notes: String(data.get("notes") ?? ""),
      });
      if (result.error) {
        setMessage(result.error);
        setFields(result.fields ?? {});
        return;
      }
      router.push(result.id ? "/wishlist/" + result.id : "/wishlist");
      router.refresh();
    });
  }

  const error = (key: string) => (fields[key] ? <p className="field-error">{fields[key][0]}</p> : null);

  return (
    <form className="space-y-6" noValidate onSubmit={(event) => { event.preventDefault(); submit(event.currentTarget); }}>
      <div className="space-y-2">
        <Label htmlFor="title">What is it?</Label>
        <Input id="title" name="title" defaultValue={item?.title} placeholder="The navy winter coat" required aria-invalid={Boolean(fields.title)} />
        {error("title")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Why this one? <span className="font-normal text-muted-foreground">optional</span></Label>
        <textarea id="description" name="description" rows={4} className={fieldClass} defaultValue={item?.description ?? ""} placeholder="Size, colour, the detail that matters." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="productUrl">Link <span className="font-normal text-muted-foreground">optional, https only</span></Label>
        <Input id="productUrl" name="productUrl" type="url" inputMode="url" defaultValue={item?.product_url ?? ""} placeholder="https://" aria-invalid={Boolean(fields.productUrl)} />
        {error("productUrl")}
        <p className="text-sm text-muted-foreground">We keep the link as you typed it. Nothing is fetched from the page.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="price">Roughly <span className="font-normal text-muted-foreground">optional</span></Label>
          <Input id="price" name="price" inputMode="decimal" defaultValue={item?.price_minor != null ? (item.price_minor / 100).toFixed(2) : ""} placeholder="129.99" aria-invalid={Boolean(fields.price)} />
          {error("price")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" maxLength={3} defaultValue={item?.currency ?? ""} placeholder="USD" aria-invalid={Boolean(fields.currency)} />
          {error("currency")}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Kind <span className="font-normal text-muted-foreground">optional</span></Label>
          <Input id="category" name="category" defaultValue={item?.category ?? ""} placeholder="Clothes" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">How much you want it</Label>
          <select id="priority" name="priority" className={fieldClass} defaultValue={item?.priority ?? "want"}>
            {wishlistPriorities.map((value) => <option key={value} value={value}>{priorityLabels[value]}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Anything else <span className="font-normal text-muted-foreground">optional</span></Label>
        <textarea id="notes" name="notes" rows={3} className={fieldClass} defaultValue={item?.notes ?? ""} />
        <p className="text-sm text-muted-foreground">Your partner can read everything on this wish. It is a hint, not a secret.</p>
      </div>
      {message ? <div role="alert" className="status-message status-error"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{message}</div> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Saving..." : item ? "Save changes" : "Add to my wishlist"}</Button>
        <Button asChild variant="ghost"><Link href={item ? "/wishlist/" + item.id : "/wishlist"}>Cancel</Link></Button>
      </div>
    </form>
  );
}
