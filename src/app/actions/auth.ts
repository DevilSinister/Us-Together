"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, signInSchema, signUpSchema, updatePasswordSchema } from "@/lib/auth/schemas";
import type { ActionState } from "@/lib/auth/types";
import { endDeveloperSession, hasDeveloperSession } from "@/lib/auth/dev-session";

function configurationError(): ActionState {
  return {
    status: "error",
    message: "Authentication is not configured yet. Add the Supabase values from .env.example.",
  };
}

export async function signInAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return configurationError();
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "We couldn't sign you in. Check your email and password." };

  await endDeveloperSession();
  redirect("/home");
}

export async function signUpAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return configurationError();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${appUrl}/auth/confirm?next=/onboarding` },
  });

  if (error) return { status: "error", message: "We couldn't create the account. Try again in a moment." };
  return { status: "success", message: "Check your email to finish creating your account." };
}

export async function forgotPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address.", fields: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return configurationError();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
  });

  return { status: "success", message: "If that address has an account, a recovery email is on its way." };
}

export async function updatePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return configurationError();
  }

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", message: "This recovery link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "We couldn't update your password. Request a new recovery link." };

  return { status: "success", message: "Password updated. You can continue to your private space." };
}

export async function signOutAction() {
  if (await hasDeveloperSession()) {
    await endDeveloperSession();
    redirect("/sign-in");
  }
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
