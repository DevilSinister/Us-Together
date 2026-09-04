"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Flag, HeartHandshake, Home, Images, ListChecks, Menu, UserRound, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const items: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/plans", label: "Plans", icon: CalendarDays },
  { href: "/bucket", label: "Bucket lists", icon: ListChecks },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/milestones", label: "Moments", icon: Flag },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/pairing", label: "Partner", icon: HeartHandshake },
];
const primaryPaths = ["/home", "/calendar", "/bucket", "/memories"];
const mobileTarget = "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreItems = items.filter((item) => !primaryPaths.includes(item.href));
  const moreActive = moreItems.some((item) => isActive(item.href));

  return <>
    <nav className={mobile ? "fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-0.5 border-t bg-card pl-[max(.25rem,env(safe-area-inset-left))] pr-[max(.25rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] md:hidden" : "mt-12 space-y-2"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      {items.filter((item) => !mobile || primaryPaths.includes(item.href)).map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(mobile ? mobileTarget : "flex min-h-11 items-center gap-3 rounded-[0.875rem] px-4 text-sm", active ? "bg-secondary font-semibold text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><Icon aria-hidden="true" className={mobile ? "size-5 shrink-0" : "size-4"} /><span className="whitespace-nowrap">{mobile && href === "/bucket" ? "Lists" : label}</span></Link>;
      })}
      {mobile ? <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className={cn(mobileTarget, moreActive || open ? "bg-secondary font-semibold text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><Menu aria-hidden="true" className="size-5" /><span>More</span></button> : null}
    </nav>
    {mobile ? <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="More destinations" className="max-w-sm">
        <DialogHeader><DialogTitle>More together.</DialogTitle></DialogHeader>
        <nav aria-label="More navigation" className="mt-5 space-y-1">
          {moreItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={isActive(href) ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-lg px-3 text-base focus-visible:outline-2 focus-visible:outline-ring", isActive(href) ? "bg-secondary font-semibold text-secondary-foreground" : "hover:bg-secondary")}><Icon aria-hidden="true" className="size-5" />{label}</Link>)}
        </nav>
      </DialogContent>
    </Dialog> : null}
  </>;
}
