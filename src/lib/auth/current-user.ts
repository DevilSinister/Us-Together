import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasDeveloperSession } from "@/lib/auth/dev-session";

export type CurrentIdentity = { kind: "developer"; userId: "local-test-user" } | { kind: "supabase"; userId: string };

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  if (await hasDeveloperSession()) return { kind: "developer", userId: "local-test-user" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    return userId ? { kind: "supabase", userId } : null;
  } catch {
    return null;
  }
}
