"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { Brush, CalendarDays, Flag, Gift, ListChecks, NotebookPen, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { floatingActionClass } from "@/components/app/cover";

const others: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/memories/new", label: "Memory", icon: Sparkles },
  { href: "/milestones/new", label: "Moment", icon: Flag },
  { href: "/bucket/new", label: "Idea", icon: ListChecks },
  { href: "/notes/new", label: "Note", icon: NotebookPen },
  { href: "/drawings/new", label: "Drawing", icon: Brush },
  { href: "/wishlist/new", label: "Wish", icon: Gift },
];

const CreateContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

/**
 * Home's create sheet. Every create action lives here so the page itself stays
 * a reading surface. The sheet is rendered once; the triggers below only open
 * it, so a phone's floating button and a desktop's inline one can never show
 * two sheets. On a phone it rises from the bottom edge, near the thumb.
 */
export function HomeCreateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <CreateContext.Provider value={{ open, setOpen }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Start something"
          className="mb-0 w-full max-w-none rounded-b-none rounded-t-surface border-x-0 border-b-0 sm:mb-auto sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-panel sm:border"
        >
          <DialogHeader><DialogTitle>Start something</DialogTitle></DialogHeader>
          <nav aria-label="Create" className="mt-5 space-y-2 pb-[env(safe-area-inset-bottom)]">
            <Button asChild size="lg" className="w-full justify-start">
              <Link href="/plans/new" onClick={() => setOpen(false)}><CalendarDays className="size-5" aria-hidden="true" />New plan</Link>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {others.map(({ href, label, icon: Icon }) => (
                <Button key={href} asChild variant="outline" size="lg" className="justify-start px-4">
                  <Link href={href} onClick={() => setOpen(false)}><Icon className="size-5 text-primary" aria-hidden="true" />{label}</Link>
                </Button>
              ))}
            </div>
          </nav>
        </DialogContent>
      </Dialog>
    </CreateContext.Provider>
  );
}

/**
 * `floating` is the phone's button above the bottom navigation; `inline` sits
 * beside the greeting from tablet width up, where a floating button would sit
 * on top of the content.
 */
export function CreateTrigger({ variant }: { variant: "floating" | "inline" }) {
  const context = useContext(CreateContext);
  if (!context) return null;
  const { open, setOpen } = context;

  if (variant === "inline") {
    return (
      <Button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="hidden shrink-0 md:inline-flex">
        <Plus className="size-4" aria-hidden="true" />Start something
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Start something"
      onClick={() => setOpen(true)}
      className={floatingActionClass}
    >
      <Plus className="size-6" aria-hidden="true" />
    </button>
  );
}
