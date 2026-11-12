"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Trash2, type LucideIcon } from "lucide-react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { cn } from "@/lib/utils";

export type EntryMenuItem =
  | { kind: "link"; label: string; href: string; icon?: LucideIcon }
  | { kind: "action"; label: string; onSelect: () => void; icon?: LucideIcon; disabled?: boolean };

/** Where the list sits on the page: under the button, right edges aligned, scrolling with the page. */
function measure(button: HTMLButtonElement | null) {
  const box = button?.getBoundingClientRect();
  return box ? { top: box.bottom + window.scrollY + 8, right: Math.max(8, document.documentElement.clientWidth - box.right) } : null;
}

type Deletion = Omit<ComponentProps<typeof ConfirmDelete>, "trigger" | "open" | "onOpenChange" | "variant" | "size" | "className">;

/**
 * The three-dot "More options" in a cover's top-right corner (ADR-053): the
 * home of Edit, Delete and the other things you do to an entry rather than
 * with it, so the page itself ends on its content. The list opens on the page
 * layer, above the cover (whose clipped edges would cut it), scrolls with the
 * page, and closes on a choice, Escape or an outside tap. Arrow keys move
 * between items.
 * Delete opens the shared confirmation, never deletes from the menu itself.
 */
export function EntryMenu({ label, items, deletion }: {
  /** What the list is called for a screen reader: "Plan options". */
  label: string;
  items: EntryMenuItem[];
  deletion?: Deletion;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [place, setPlace] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("[role=menuitem]:not([aria-disabled=true])")?.focus();
    const away = (event: PointerEvent) => {
      if (!list.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false);
    };
    // A phone fires resize as its address bar slides away, so resizing moves the list rather than closing it.
    const follow = () => setPlace(measure(button.current));
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  function toggle() {
    setPlace(measure(button.current));
    setOpen((value) => !value);
  }

  function choose(run: () => void) {
    setOpen(false);
    run();
  }

  const row = "flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-semibold hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none aria-disabled:opacity-50";

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        className="grid size-11 place-items-center rounded-full bg-[rgb(8_7_6/0.42)] text-[var(--cover-foreground)] transition-[background-color,transform] duration-200 hover:bg-[rgb(8_7_6/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
      >
        <MoreVertical className="size-5" aria-hidden="true" />
      </button>

      {open && place ? createPortal(
        <div
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          style={{ top: place.top, right: place.right }}
          onKeyDown={(event) => {
            const rows = [...(list.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
            const at = rows.indexOf(document.activeElement as HTMLElement);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              rows[(at + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length]?.focus();
            }
            if (event.key === "Escape") { event.preventDefault(); setOpen(false); button.current?.focus(); }
            if (event.key === "Tab") setOpen(false);
          }}
          className="absolute z-50 w-60 overflow-hidden rounded-panel border border-border bg-card py-1.5 text-foreground shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)]"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const content = <>{Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> : null}{item.label}</>;
            return item.kind === "link"
              ? <Link key={item.label} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={row}>{content}</Link>
              : <button key={item.label} type="button" role="menuitem" aria-disabled={item.disabled || undefined} onClick={() => { if (!item.disabled) choose(item.onSelect); }} className={row}>{content}</button>;
          })}
          {deletion ? (
            <>
              {items.length ? <div className="my-1.5 border-t border-border" role="none" /> : null}
              <button type="button" role="menuitem" onClick={() => choose(() => setConfirming(true))} className={cn(row, "text-danger hover:bg-danger/10 focus-visible:bg-danger/10")}>
                <Trash2 className="size-4" aria-hidden="true" />{deletion.label}
              </button>
            </>
          ) : null}
        </div>,
        document.body,
      ) : null}

      {deletion ? <ConfirmDelete {...deletion} trigger={false} open={confirming} onOpenChange={setConfirming} /> : null}
    </>
  );
}
