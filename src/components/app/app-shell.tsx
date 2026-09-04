import Link from "next/link";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppNavigation } from "@/components/app/app-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden min-h-screen flex-col border-r bg-card px-5 py-6 md:flex">
        <Link href="/home"><BrandMark /></Link>
        <AppNavigation />
        <div className="mt-auto flex items-center gap-2"><ThemeToggle /><form action={signOutAction} className="flex-1"><Button variant="ghost" className="w-full justify-start"><LogOut className="size-4" />Sign out</Button></form></div>
      </aside>
      <div className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex items-center justify-between border-b bg-card px-5 py-4 md:hidden"><Link href="/home"><BrandMark /></Link><div className="flex items-center gap-1"><ThemeToggle /><form action={signOutAction}><Button variant="ghost" size="sm" aria-label="Sign out"><LogOut className="size-4" /></Button></form></div></header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">{children}</main>
      </div>
      <AppNavigation mobile />
    </div>
  );
}
