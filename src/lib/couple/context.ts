import "server-only";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Phase 7 reads and writes only through a connected account. The developer preview
 * has no local wishlist or note store, so callers show an honest unavailable state
 * rather than a second source of truth.
 */
export async function coupleContext() {
  const identity = await getCurrentIdentity();
  if (!identity) throw new Error("Sign in again to open your shared space.");
  if (identity.kind !== "supabase") return { kind: "preview" as const };
  const db = await createServerSupabaseClient();
  const { data: membership, error } = await db
    .from("couple_memberships")
    .select("couple_id")
    .eq("user_id", identity.userId)
    .is("left_at", null)
    .maybeSingle();
  if (error) throw new Error("We could not open your shared space. Try again.");
  return { kind: "database" as const, db, userId: identity.userId, coupleId: membership?.couple_id ?? null };
}

/** The other active member, used only for labels. Never for authorization. */
export async function partnerName(context: Extract<Awaited<ReturnType<typeof coupleContext>>, { kind: "database" }>) {
  if (!context.coupleId) return null;
  const { data } = await context.db
    .from("couple_memberships")
    .select("user_id")
    .eq("couple_id", context.coupleId)
    .is("left_at", null)
    .neq("user_id", context.userId)
    .maybeSingle();
  if (!data) return null;
  const { data: profile } = await context.db
    .from("profiles")
    .select("display_name")
    .eq("user_id", data.user_id)
    .maybeSingle();
  return profile?.display_name ?? null;
}
