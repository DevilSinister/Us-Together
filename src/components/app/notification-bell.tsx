"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

export function NotificationBell({ count }: { count: number }) {
  const pathname = usePathname();

  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      aria-current={pathname === "/notifications" ? "page" : undefined}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-control text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Bell className="size-5" aria-hidden="true" />
      {count > 0 ? (
        <span aria-hidden="true" className="absolute right-0 top-0 grid min-w-5 h-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold leading-none text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
