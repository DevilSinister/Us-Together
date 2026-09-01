import Link from "next/link";
import { HeartHandshake, Home, LogOut, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden min-h-screen flex-col border-r bg-card px-5 py-6 md:flex">
        <Link href="/home"><BrandMark /></Link>
        <nav className="mt-12 space-y-2" aria-label="Main navigation">
          <Link href="/home" className="flex min-h-11 items-center gap-3 rounded-[0.875rem] bg-secondary px-4 font-semibold text-secondary-foreground"><Home className="size-4" />Home</Link>
          <Link href="/profile" className="flex min-h-11 items-center gap-3 rounded-[0.875rem] px-4 text-muted-foreground hover:bg-secondary hover:text-foreground"><UserRound className="size-4" />Profile</Link>
          <Link href="/pairing" className="flex min-h-11 items-center gap-3 rounded-[0.875rem] px-4 text-muted-foreground hover:bg-secondary hover:text-foreground"><HeartHandshake className="size-4" />Partner</Link>
        </nav>
        <div className="mt-auto flex items-center gap-2"><ThemeToggle /><form action={signOutAction} className="flex-1"><Button variant="ghost" className="w-full justify-start"><LogOut className="size-4" />Sign out</Button></form></div>
      </aside>
      <div className="min-w-0 pb-20 md:pb-0">
        <header className="flex items-center justify-between border-b bg-card px-5 py-4 md:hidden"><Link href="/home"><BrandMark /></Link><div className="flex items-center gap-1"><ThemeToggle /><form action={signOutAction}><Button variant="ghost" size="sm" aria-label="Sign out"><LogOut className="size-4" /></Button></form></div></header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card/95 px-[max(1rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile navigation">
        <Link href="/home" className="grid min-h-16 place-items-center gap-1 py-2 text-xs font-semibold text-primary"><Home className="size-5" />Home</Link>
        <Link href="/profile" className="grid min-h-16 place-items-center gap-1 py-2 text-xs text-muted-foreground"><UserRound className="size-5" />Profile</Link>
        <Link href="/pairing" className="grid min-h-16 place-items-center gap-1 py-2 text-xs text-muted-foreground"><HeartHandshake className="size-5" />Partner</Link>
      </nav>
    </div>
  );
}
