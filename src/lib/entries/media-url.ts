/**
 * The one place that knows how a private media file is addressed.
 *
 * The route itself is authorized server-side and answers 404 for anything the
 * caller may not read, so this builder is a convenience, never a permission.
 * It exists so the memories list, the gallery tile and the viewer cannot drift
 * apart on the query-string shape.
 */

import type { EntryKind } from "./types";

export type MediaVariant = "original" | "preview" | "download";

export function mediaHref(id: string, kind: EntryKind, variant: MediaVariant = "original"): string {
  return "/api/memory-media/" + encodeURIComponent(id)
    + "?kind=" + encodeURIComponent(kind)
    + "&variant=" + variant;
}
