/**
 * Who appears as whom.
 *
 * The rule, field by field: what I chose wins, and my partner's own profile is
 * a fallback only for the name I left empty - never for the picture.
 *
 *   name    my presentation -> their profile display name -> "Your partner"
 *   picture my presentation -> nothing
 *   colour  my presentation -> "rose"
 *
 * The picture chain terminating at nothing is the point of the design, not an
 * oversight. Falling back to their own `profiles.avatar_path` would require a
 * cross-account read on the `avatars` bucket, which is precisely the policy
 * this whole shape exists to avoid. Absent a picture we draw initials on the
 * colour I chose, which is a perfectly good answer.
 *
 * A nickname is also the more correct thing to show in this product than
 * whatever someone typed into a signup form. Their own display name is the
 * right thing to show *them*.
 */

import { toAvatarStyle, type AvatarStyle } from "./styles";

export type ResolvedIdentity = {
  name: string;
  /** The avatar route, or null when there is no picture to fetch. */
  src: string | null;
  style: AvatarStyle;
};

export type OwnProfile = { display_name: string | null; avatar_path: string | null; avatar_style: string | null } | null;
export type PartnerPresentation = { display_name: string | null; avatar_path: string | null; avatar_style: string | null } | null;
/**
 * Deliberately widened to admit an `avatar_path` this function will not read,
 * so the test suite can pass one in and prove it is ignored.
 */
export type PartnerProfile = { display_name: string | null; avatar_path?: string | null } | null;

/**
 * The avatar route plus a version derived from the stored object path.
 *
 * The route answers with `max-age=300`, so an unversioned URL let a browser keep
 * showing the old face for five minutes after a new one was saved in Settings.
 * Every upload mints a fresh UUID path, so hashing the path yields a new URL the
 * moment the picture changes and the same URL for as long as it does not. The
 * hash is a short FNV-1a digest: the path itself (it carries a user id) never
 * reaches the page.
 */
export function avatarSrc(scope: "me" | "partner", path: string | null | undefined): string | null {
  if (!path) return null;
  let hash = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    hash ^= path.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return "/api/avatar/" + scope + "?v=" + (hash >>> 0).toString(36);
}

export function resolveMe(profile: OwnProfile, fallbackName = "You"): ResolvedIdentity {
  return {
    name: profile?.display_name?.trim() || fallbackName,
    src: avatarSrc("me", profile?.avatar_path),
    style: toAvatarStyle(profile?.avatar_style),
  };
}

export function resolvePartner(presentation: PartnerPresentation, partnerProfile: PartnerProfile): ResolvedIdentity {
  return {
    name: presentation?.display_name?.trim() || partnerProfile?.display_name?.trim() || "Your partner",
    src: avatarSrc("partner", presentation?.avatar_path),
    style: toAvatarStyle(presentation?.avatar_style),
  };
}

/**
 * Whether to ask "still call them this?" after pairing.
 *
 * It fires for exactly one scenario - pairing with a different person while an
 * earlier partner's name and face are still recorded - and the cost of getting
 * that wrong is high enough to justify one confirmation.
 */
export function needsPairingConfirmation(
  presentation: { display_name: string | null; confirmed_couple_id: string | null } | null,
  activeCoupleId: string | null,
): boolean {
  if (!activeCoupleId) return false;
  if (!presentation?.display_name?.trim()) return false;
  return presentation.confirmed_couple_id !== activeCoupleId;
}
