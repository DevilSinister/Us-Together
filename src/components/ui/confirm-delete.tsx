"use client";
import { useState, useTransition, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/**
 * The single way anything is deleted: a danger button that opens a
 * confirmation, never a disclosure or a typed word on the page itself.
 *
 * `onConfirm` resolves to an error message to show inside the dialog, or to
 * nothing on success. When the deletion navigates away (`leavesPage`), the
 * dialog stays open in its pending state until the route changes, so the
 * deleted thing is never visible again after the partner said yes.
 *
 * `blocked` names a precondition the server would refuse - "remove the files
 * first" - so the dialog can explain it rather than fail after the click.
 *
 * `trigger={false}` with `open`/`onOpenChange` lets a menu item open the same
 * confirmation - the photo viewer keeps Delete behind its three-dot menu.
 */
export function ConfirmDelete({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  blocked,
  leavesPage = false,
  size,
  variant = "danger",
  className,
  trigger = true,
  open: controlledOpen,
  onOpenChange,
}: {
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<string | null | undefined | void>;
  blocked?: string | null;
  leavesPage?: boolean;
  size?: "default" | "sm";
  variant?: "danger" | "ghost";
  className?: string;
  trigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => { setOwnOpen(next); onOpenChange?.(next); };
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const busy = pending || done;

  function confirm() {
    setError("");
    start(async () => {
      try {
        const failure = await onConfirm();
        if (failure) { setError(failure); return; }
        if (leavesPage) setDone(true);
        else setOpen(false);
      } catch {
        setError("The connection dropped before we heard back. Refresh to see whether it was deleted, then try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); setError(""); } }}>
      {trigger ? (
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={variant === "ghost" ? "text-danger hover:bg-danger/10 hover:text-danger " + (className ?? "") : className}
          >
            <Trash2 className="size-4" aria-hidden="true" />{label}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent title={title} dismissible={!busy}>
        {/* No header rule: the footer's rule already separates the question from the answer. */}
        <DialogHeader className="border-b-0 pb-0">
          <span className="grid size-11 place-items-center rounded-full bg-danger/10 text-danger">
            <Trash2 className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle className="pt-2">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {blocked ? <p className="status-message mt-5 bg-secondary text-secondary-foreground">{blocked}</p> : null}
        {error ? <p role="alert" className="status-message status-error mt-5">{error}</p> : null}
        <DialogFooter>
          {/* Keeping is the default: focus lands here, so Enter never deletes. */}
          <Button type="button" variant="ghost" autoFocus disabled={busy} onClick={() => setOpen(false)}>Keep it</Button>
          <Button type="button" variant="destructive" disabled={busy || Boolean(blocked)} onClick={confirm}>
            {busy ? "Deleting…" : confirmLabel ?? label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
