import "server-only";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveMe, resolvePartner, type ResolvedIdentity } from "./resolve";

export type Identities = { me: ResolvedIdentity; partner: ResolvedIdentity };

const ANONYMOUS: Identities = {
  me: { name: "You", src: null, style: "rose" },
  partner: { name: "Your partner", src: null, style: "rose" },
};

/**
 * Both faces for the signed-in session, resolved once per request in the
 * protected layout and handed to client components through a context.
 *
 * Reading my partner's `display_name` is already permitted by
 * `profiles_select_self_or_partner`, so the name fallback costs no new policy.
 * Nothing here reads their `avatar_path`; see resolve.ts for why that chain
 * terminates instead.
 */
export async function loadIdentities(): Promise<Identities> {
  try {
    const identity = await getCurrentIdentity();
    if (!identity) return ANONYMOUS;

    if (identity.kind === "developer") {
      const state = await readDeveloperState();
      return {
        me: resolveMe({ display_name: state.displayName || null, avatar_path: null, avatar_style: state.avatarStyle }),
        partner: resolvePartner(
          state.partnerProfile
            ? { display_name: state.partnerProfile.displayName, avatar_path: null, avatar_style: state.partnerProfile.avatarStyle }
            : null,
          null,
        ),
      };
    }

    const db = await createServerSupabaseClient();
    const [{ data: profile }, { data: presentation }, { data: membership }] = await Promise.all([
      db.from("profiles").select("display_name,avatar_path,avatar_style").eq("user_id", identity.userId).maybeSingle(),
      db.from("partner_presentations").select("display_name,avatar_path,avatar_style").eq("owner_id", identity.userId).maybeSingle(),
      db.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
    ]);

    let partnerProfile: { display_name: string | null } | null = null;
    if (membership) {
      const { data: other } = await db.from("couple_memberships")
        .select("user_id").eq("couple_id", membership.couple_id).is("left_at", null)
        .neq("user_id", identity.userId).maybeSingle();
      if (other) {
        const { data } = await db.from("profiles").select("display_name").eq("user_id", other.user_id).maybeSingle();
        partnerProfile = data ?? null;
      }
    }

    return { me: resolveMe(profile ?? null), partner: resolvePartner(presentation ?? null, partnerProfile) };
  } catch {
    // An avatar is never worth failing a page over.
    return ANONYMOUS;
  }
}
