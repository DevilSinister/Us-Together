import { createHash } from "node:crypto";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * One avatar, either mine or the one I chose for my partner.
 *
 * `scope` is a closed pair of literals, not an identifier. Nothing here accepts
 * a caller-supplied path and there is no id to enumerate: both branches derive
 * the object from the session, and both are plain own-folder reads under the
 * `avatars` bucket's existing policies. No cross-account read exists.
 *
 * Every failure is 404 - no session, a preview identity, no row, no picture, an
 * unreadable object - so the route never distinguishes "nothing here" from "not
 * allowed", matching the other two private-media routes.
 *
 * It proxies rather than redirecting to a signed URL, unlike memory-media: an
 * avatar repeats many times on one page, and a 307 per bubble would cost two
 * round trips each and produce a URL no browser can cache.
 *
 * The caching header is a deliberate departure from the `no-store` those routes
 * use. An avatar is chrome that the requesting account uploaded itself, not
 * content, and `private` keeps it out of any shared cache. Uploads always mint a
 * fresh UUID path, so the ETag changes the instant the picture does and a stale
 * face cannot persist.
 */

const CACHE = "private, max-age=300, must-revalidate";
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const missing = () => new Response("Not found", { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ scope: string }> }) {
  const { scope } = await params;
  if (scope !== "me" && scope !== "partner") return missing();

  try {
    const identity = await getCurrentIdentity();
    if (identity?.kind !== "supabase") return missing();
    const db = await createServerSupabaseClient();

    const { data } = scope === "me"
      ? await db.from("profiles").select("avatar_path").eq("user_id", identity.userId).maybeSingle()
      : await db.from("partner_presentations").select("avatar_path").eq("owner_id", identity.userId).maybeSingle();

    const path = data?.avatar_path;
    if (!path) return missing();

    // Taken from the stored path, never from the blob's own claim about itself.
    const contentType = TYPES[path.split(".").pop()?.toLowerCase() ?? ""];
    if (!contentType) return missing();

    const etag = '"' + createHash("sha256").update(path).digest("hex").slice(0, 16) + '"';
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE } });
    }

    const { data: file } = await db.storage.from("avatars").download(path);
    if (!file) return missing();

    return new Response(await file.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE,
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return missing();
  }
}
