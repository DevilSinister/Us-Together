import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Recover account" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Let’s get you back in." lede="Enter your email. We’ll send a recovery link if it belongs to an account.">
      <AuthForm action={forgotPasswordAction} mode="forgot-password" />
      <p className="mt-6 text-center text-sm"><Link href="/sign-in" className="font-semibold text-primary underline-offset-4 hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}
