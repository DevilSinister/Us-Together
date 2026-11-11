import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { AppNavigation } from "@/components/app/app-navigation";
import { NotificationBell } from "@/components/app/notification-bell";
import { SearchProvider, SearchTrigger } from "@/components/search/search";

/**
 * The signed-in frame. The top bar carries only what is reached for often:
 * search and notifications. Appearance and signing out are set once and live
 * in Profile.
 */
export function AppShell({ children, unreadCount }: { children: React.ReactNode; unreadCount: number }) {
  return (
    <SearchProvider>
      <div className="app-frame min-h-screen bg-background md:grid md:grid-cols-[16rem_1fr] md:items-start">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-control focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-action"
        >
          Skip to content
        </a>
        <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r bg-card px-5 py-6 md:flex">
          <Link href="/home" className="rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><BrandMark /></Link>
          <SearchTrigger variant="sidebar" />
          <AppNavigation />
        </aside>
        <div className="relative min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {/* Solid and sticky on every page; laid transparently over the photograph
              on a page with a cover (see .shell-header in globals.css). */}
          <header className="shell-header z-20 flex items-center justify-between px-5 py-4 md:hidden">
            <Link href="/home" className="shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><BrandMark className="gap-1.5 whitespace-nowrap text-base sm:gap-2 sm:text-xl" /></Link>
            <div className="flex items-center gap-1">
              <SearchTrigger variant="icon" />
              <NotificationBell count={unreadCount} />
            </div>
          </header>
          <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">{children}</main>
        </div>
        <AppNavigation mobile />
      </div>
    </SearchProvider>
  );
}
