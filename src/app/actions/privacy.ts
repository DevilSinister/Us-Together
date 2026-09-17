"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { lockArea, pinCode, currentPinCode } from "@/lib/privacy/areas";

async function authenticatedDb() {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Sign in to manage privacy locks.");
  return db;
}

export async function configurePrivacyLocks(input: unknown) {
  const parsed = z.object({ code: currentPinCode, areas: z.array(lockArea).max(9) }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your choices." };
  try {
    const db = await authenticatedDb();
    const { data, error } = await db.rpc("app_lock_configure", parsed.data);
    if (error) throw error;
    if (!data) return { error: "PIN was incorrect or temporarily blocked. Try again later." };
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch { return { error: "Could not save locks. Try again." }; }
}

export async function verifyPrivacyCode(input: unknown) {
  const parsed = currentPinCode.safeParse(input);
  if (!parsed.success) return { error: "Enter your PIN." };
  try {
    const db = await authenticatedDb();
    const { data, error } = await db.rpc("app_lock_verify", { code: parsed.data });
    if (error) throw error;
    return data ? { ok: true as const } : { error: "PIN was incorrect or temporarily blocked." };
  } catch { return { error: "Could not verify the code." }; }
}

export async function unlockPrivacyArea(input: unknown) {
  const parsed = z.object({ code: currentPinCode, area: lockArea }).safeParse(input);
  if (!parsed.success) return { error: "Enter your PIN." };
  try {
    const db = await authenticatedDb();
    const { data, error } = await db.rpc("app_lock_unlock", parsed.data);
    if (error) throw error;
    if (!data) return { error: "PIN was incorrect or temporarily blocked." };
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch { return { error: "Could not unlock this section." }; }
}

export async function lockPrivacyArea(input: unknown) {
  const parsed = lockArea.safeParse(input);
  if (!parsed.success) return { error: "Unknown section." };
  try {
    const db = await authenticatedDb();
    const { error } = await db.rpc("app_lock_lock", { area: parsed.data });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch { return { error: "Could not lock this section." }; }
}

export async function changePrivacyPin(input: unknown) {
  const parsed = z.object({ current_code: currentPinCode, new_code: pinCode }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your PIN." };
  try {
    const db = await authenticatedDb();
    const { data, error } = await db.rpc("app_lock_change_code", parsed.data);
    if (error) throw error;
    if (!data) return { error: "Current PIN was incorrect or temporarily blocked." };
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch { return { error: "Could not change your PIN. Try again." }; }
}
