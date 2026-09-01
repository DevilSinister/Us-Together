import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Recover account" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Account recovery</p>
      <h1 className="mt-3 font-display text-4xl tracking-[-0.025em] sm:text-5xl">Let’s get you back in.</h1>
      <p className="mt-4 mb-8 leading-7 text-muted-foreground">Enter your email. We’ll send a recovery link if it belongs to an account.</p>
      <AuthForm action={forgotPasswordAction} mode="forgot-password" />
      <p className="mt-7 text-center text-sm"><Link href="/sign-in" className="font-semibold text-primary hover:underline">Back to sign in</Link></p>
    </>
  );
}
