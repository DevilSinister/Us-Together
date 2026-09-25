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

/**
 * The other active member's name as the caller sees it, used only for labels.
 * Never for authorization.
 *
 * It follows the same rule as lib/avatar/resolve.ts: the name I chose for my
 * partner in Settings wins, and their own profile name is the fallback. Reading
 * their profile directly here used to print the signup name on notes, drawings
 * and wishes while the avatar beside it showed the name I had chosen.
 */
export async function partnerName(context: Extract<Awaited<ReturnType<typeof coupleContext>>, { kind: "database" }>) {
  if (!context.coupleId) return null;
  const [{ data }, { data: presentation }] = await Promise.all([
    context.db
      .from("couple_memberships")
      .select("user_id")
      .eq("couple_id", context.coupleId)
      .is("left_at", null)
      .neq("user_id", context.userId)
      .maybeSingle(),
    context.db.from("partner_presentations").select("display_name").eq("owner_id", context.userId).maybeSingle(),
  ]);
  if (!data) return null;
  const chosen = presentation?.display_name?.trim();
  if (chosen) return chosen;
  const { data: profile } = await context.db
    .from("profiles")
    .select("display_name")
    .eq("user_id", data.user_id)
    .maybeSingle();
  return profile?.display_name?.trim() || null;
}
