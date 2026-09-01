import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    redirect("/sign-in");
  }

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/forgot-password");

  return (
    <>
      <p className="text-sm font-semibold text-primary">Account recovery</p>
      <h1 className="mt-3 font-display text-4xl tracking-[-0.025em] sm:text-5xl">Choose a new password.</h1>
      <p className="mt-4 mb-8 leading-7 text-muted-foreground">Make it unique and keep it somewhere only you can access.</p>
      <AuthForm action={updatePasswordAction} mode="reset-password" />
      <p className="mt-7 text-center text-sm"><Link href="/home" className="font-semibold text-primary hover:underline">Continue to Us Together</Link></p>
    </>
  );
}
