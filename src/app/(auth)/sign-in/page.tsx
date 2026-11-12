import type { Metadata } from "next";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { developerLoginAction } from "@/app/actions/developer";
import { isDeveloperLoginEnabled } from "@/lib/auth/dev-session";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Welcome back." lede="Your own private little world.">
      {error ? <p className="status-message status-error mb-5" role="alert">{error}</p> : null}
      <AuthForm action={signInAction} mode="sign-in" />
      {isDeveloperLoginEnabled() ? (
        <div className="mt-6 border-t pt-6">
          <form action={developerLoginAction} className="grid gap-3">
            <input type="hidden" name="fixture" value="paired" />
            <Button type="submit" variant="outline" className="w-full">Enter paired preview</Button>
          </form>
          <form action={developerLoginAction} className="mt-3">
            <input type="hidden" name="fixture" value="solo" />
            <Button type="submit" variant="ghost" className="w-full">Test onboarding from scratch</Button>
          </form>
          <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">Local testing only. This bypass is unavailable in production builds.</p>
        </div>
      ) : null}
      <p className="mt-6 text-center text-sm text-muted-foreground">New here? <Link href="/sign-up" className="font-semibold text-primary underline-offset-4 hover:underline">Create your space</Link></p>
    </AuthShell>
  );
}
