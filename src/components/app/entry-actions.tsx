import type { ReactNode } from "react";

/**
 * The foot of every detail page: Edit and Delete, side by side, after the
 * thing itself. A page opens as something to read; changing or removing it
 * waits at the end. Delete is always a ConfirmDelete, never inline.
 */
export function EntryActions({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label} className="mt-12 border-t pt-6">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {hint ? <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{hint}</p> : null}
    </section>
  );
}
