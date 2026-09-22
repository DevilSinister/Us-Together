/**
 * Optimistic comment state.
 *
 * A posted comment appears immediately, before the round trip, and is replaced
 * by the server's own row on the next load. The hazard is the partner-sync
 * poll: it can land between the optimistic insert and the reload, and a naive
 * `setComments(serverList)` would then erase a bubble the writer can see on
 * screen. `mergePending` is what stops that — every server list is merged
 * rather than assigned.
 *
 * Pending rows carry a `pending:` id so the renderer can tell them apart, and
 * so no code path can mistake one for something the server can delete.
 */

import type { EntryComment } from "./types";

export const PENDING_PREFIX = "pending:";

export function isPending(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

function pendingKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

/** The bubble shown while the write is in flight. */
export function optimisticComment(body: string, now: Date = new Date(), key: string = pendingKey()): EntryComment {
  return {
    id: PENDING_PREFIX + key,
    body: body.trim(),
    created_at: now.toISOString(),
    mine: true,
  };
}

/**
 * Take the server's list, carrying over any pending rows it does not yet know
 * about.
 *
 * A pending row is considered landed — and so dropped — when the server list
 * contains one of my own comments with the same trimmed body. Matching on body
 * rather than on id is the only option available: the server assigns the real
 * id, and nothing returns the mapping. The failure mode is benign and rare:
 * sending identical text twice inside the window before the first reload drops
 * one bubble early, and the next reload restores it.
 */
export function mergePending(server: EntryComment[], current: EntryComment[]): EntryComment[] {
  const landed = new Set(server.filter(c => c.mine).map(c => c.body.trim()));
  const stillPending = current.filter(c => isPending(c.id) && !landed.has(c.body.trim()));
  return stillPending.length ? [...server, ...stillPending] : server;
}

/** Remove one pending row after a failed write. */
export function dropPending(list: EntryComment[], id: string): EntryComment[] {
  return list.filter(c => c.id !== id);
}
