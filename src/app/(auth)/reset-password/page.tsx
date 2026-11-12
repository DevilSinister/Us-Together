import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell title="Choose a new password." lede="Make it unique and keep it somewhere only you can access.">
      <AuthForm action={updatePasswordAction} mode="reset-password" />
      <p className="mt-6 text-center text-sm"><Link href="/home" className="font-semibold text-primary underline-offset-4 hover:underline">Continue to Us Together</Link></p>
    </AuthShell>
  );
}
