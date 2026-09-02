"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Flag, HeartHandshake, Home, Images, ListChecks, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/plans", label: "Plans", icon: CalendarDays },
  { href: "/bucket", label: "Bucket list", icon: ListChecks },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/milestones", label: "Moments", icon: Flag },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/pairing", label: "Partner", icon: HeartHandshake },
];

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card/95 px-[max(.25rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" : "mt-12 space-y-2"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
    {items.filter((item) => !mobile || item.href !== "/pairing").map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(mobile ? "grid min-h-16 place-items-center gap-1 px-1 py-2 text-xs" : "flex min-h-11 items-center gap-3 rounded-[0.875rem] px-4 text-sm", active ? mobile ? "font-semibold text-primary" : "bg-secondary font-semibold text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><Icon className={mobile ? "size-5" : "size-4"} /><span>{label}</span></Link>;
    })}
  </nav>;
}
