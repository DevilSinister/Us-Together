import type { Metadata } from "next";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your space." lede="You’ll invite your partner once your own account is verified.">
      <AuthForm action={signUpAction} mode="sign-up" />
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link href="/sign-in" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
