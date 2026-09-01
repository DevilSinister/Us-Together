import type { Metadata } from "next";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Start with you</p>
      <h1 className="mt-3 font-display text-4xl tracking-[-0.025em] sm:text-5xl">Create your private space.</h1>
      <p className="mt-4 mb-8 leading-7 text-muted-foreground">You’ll invite your partner after your own account is verified.</p>
      <AuthForm action={signUpAction} mode="sign-up" />
      <p className="mt-7 text-center text-sm text-muted-foreground">Already have an account? <Link href="/sign-in" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </>
  );
}
