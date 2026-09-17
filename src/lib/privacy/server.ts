import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import type { LockArea } from "@/lib/privacy/areas";

export async function privacyAreaOpen(area: LockArea): Promise<boolean> {
  const identity = await getCurrentIdentity();
  if (!identity) return false;
  if (identity.kind === "developer") return true;
  const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc("app_lock_open", { area });
  return !error && data === true;
}

export async function privacyLockStatus() {
  const identity = await getCurrentIdentity();
  if (!identity || identity.kind === "developer") return { configured: false, areas: [] as LockArea[], pinLength: null as 4 | 6 | null, userId: identity?.userId ?? "" };
  const db = await createServerSupabaseClient();
  const { data, error } = await db.rpc("app_lock_status");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error("Privacy settings unavailable.");
  const status = data as { configured?: unknown; areas?: unknown; pin_length?: unknown };
  return { configured: status.configured === true, pinLength: status.pin_length === 4 ? 4 as const : status.pin_length === 6 ? 6 as const : null, areas: Array.isArray(status.areas) ? status.areas as LockArea[] : [], userId: identity.userId };
}
