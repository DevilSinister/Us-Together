/**
 * What counts as an acceptable avatar file.
 *
 * The limits already existed as literals inside the onboarding action; three
 * call sites now need them - your own photo at onboarding, your partner's, and
 * both again from the profile editor - so they live in one place. The values
 * match the `avatars` bucket's own constraints, which remain the real
 * enforcement: this is the early, friendly refusal.
 */

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function avatarExtension(mime: string): "jpg" | "png" | "webp" | null {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return null;
}

export type AvatarFileCheck =
  | { ok: true; empty: true }
  | { ok: true; empty: false; mime: string; extension: "jpg" | "png" | "webp" }
  | { ok: false; message: string };

/**
 * An absent or empty file is fine - the picture is optional everywhere - so
 * "no file" and "bad file" are different answers, not the same refusal.
 */
export function validateAvatarFile(file: unknown): AvatarFileCheck {
  if (!(file instanceof File) || file.size === 0) return { ok: true, empty: true };
  const extension = avatarExtension(file.type);
  if (!extension) return { ok: false, message: "Choose a JPG, PNG, or WebP photo." };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, message: "Keep the photo under 2 MB." };
  return { ok: true, empty: false, mime: file.type, extension };
}

/**
 * Where an object goes. Both a person's own picture and the picture they chose
 * for their partner live under that account's own user id, which is what makes
 * every read a plain own-folder read and keeps the bucket's four policies
 * untouched.
 */
export function avatarObjectPath(userId: string, scope: "me" | "partner", extension: string): string {
  return scope === "me"
    ? userId + "/" + crypto.randomUUID() + "." + extension
    : userId + "/partner/" + crypto.randomUUID() + "." + extension;
}
