"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, CalendarClock, CalendarDays, Camera, Flag, Gift, HeartHandshake, Home, Images, ListChecks, Menu, NotebookPen, UserRound, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Group = "plan" | "keep" | "account";
type Destination = { href: string; label: string; short?: string; icon: LucideIcon; group?: Group };

/** Ordered to follow the product loop: dream and plan, then keep, then account. */
const items: Destination[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, group: "plan" },
  { href: "/plans", label: "Plans", icon: CalendarClock, group: "plan" },
  { href: "/bucket", label: "Bucket lists", short: "Lists", icon: ListChecks, group: "plan" },
  { href: "/memories", label: "Memories", icon: Images, group: "keep" },
  { href: "/gallery", label: "Gallery", icon: Camera, group: "keep" },
  { href: "/milestones", label: "Moments", icon: Flag, group: "keep" },
  { href: "/notes", label: "Notes", icon: NotebookPen, group: "keep" },
  { href: "/wishlist", label: "Wishlists", short: "Wishes", icon: Gift, group: "keep" },
  { href: "/notifications", label: "Notifications", icon: Bell, group: "account" },
  { href: "/profile", label: "Profile", icon: UserRound, group: "account" },
  { href: "/pairing", label: "Partner", icon: HeartHandshake, group: "account" },
];

const groups: Array<{ key: Group; label: string }> = [
  { key: "plan", label: "Plan together" },
  { key: "keep", label: "Keep together" },
  { key: "account", label: "Your account" },
];

/** The four phone destinations that sit beside More in the bottom bar. */
const mobilePaths = ["/home", "/calendar", "/bucket", "/memories"];

const mobileTarget = "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-navigation px-1 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";
const sidebarTarget = "flex min-h-11 items-center gap-3 rounded-navigation px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const activeTone = "bg-secondary font-semibold text-secondary-foreground";
const restTone = "text-muted-foreground hover:bg-secondary hover:text-foreground";

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreItems = items.filter((item) => !mobilePaths.includes(item.href));
  const moreActive = moreItems.some((item) => isActive(item.href));

  if (!mobile) {
    return (
      <nav className="mt-10 space-y-1" aria-label="Main navigation">
        {items.filter((item) => !item.group).map((item) => <SidebarLink key={item.href} item={item} active={isActive(item.href)} />)}
        {groups.map((group) => (
          <div key={group.key} className="pt-5">
            <p className="px-4 pb-2 text-xs font-semibold text-muted-foreground">{group.label}</p>
            <div className="space-y-1">
              {items.filter((item) => item.group === group.key).map((item) => <SidebarLink key={item.href} item={item} active={isActive(item.href)} />)}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-0.5 border-t bg-card pl-[max(.25rem,env(safe-area-inset-left))] pr-[max(.25rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {mobilePaths.map((href) => {
          const item = items.find((candidate) => candidate.href === href);
          if (!item) return null;
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(mobileTarget, active ? activeTone : restTone)}>
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="whitespace-nowrap">{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={cn(mobileTarget, moreActive || open ? activeTone : restTone)}
        >
          <Menu aria-hidden="true" className="size-5" />
          <span>More</span>
        </button>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="More destinations" className="max-w-sm">
          <DialogHeader><DialogTitle>More together.</DialogTitle></DialogHeader>
          <nav aria-label="More navigation" className="mt-5">
            {groups.map((group) => {
              const groupItems = moreItems.filter((item) => item.group === group.key);
              if (!groupItems.length) return null;
              return (
                <div key={group.key} className="mt-5 first:mt-0">
                  <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                  <div className="mt-2 space-y-1">
                    {groupItems.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive(href) ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-control px-3 text-base focus-visible:outline-2 focus-visible:outline-ring",
                          isActive(href) ? activeTone : "hover:bg-secondary",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SidebarLink({ item, active }: { item: Destination; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(sidebarTarget, active ? activeTone : restTone)}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}
