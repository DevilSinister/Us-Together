"use client";
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clock, MoreHorizontal, SendHorizontal } from "lucide-react";

import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { useIdentities } from "@/components/providers/identities";
import { Avatar } from "@/components/app/avatar";
import { entryComments, commentAction } from "@/app/actions/entries";
import { loadMediaComments, mediaCommentAction } from "@/app/actions/gallery";
import { previewComments, addPreviewComment, deletePreviewComment } from "@/lib/entries/preview-media";
import { dropPending, isPending, mergePending, optimisticComment } from "@/lib/entries/comments";
import { clockLabel, dayLabel, fullLabel, groupByDay, resolveTimeZone, todayKey } from "@/lib/time/day";
import type { EntryAccess, EntryComment } from "@/lib/entries/types";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { cn } from "@/lib/utils";

/**
 * Whether this session has a real pointer, read as an external store so it also
 * follows a mouse being connected mid-session. The server snapshot is `false`:
 * before hydration we assume touch, so Enter can never send a half-written
 * message on a phone.
 */
const FINE_POINTER = "(pointer: fine)";
function subscribePointer(onChange: () => void) {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * What the two of you said to each other, as a conversation.
 *
 * Author is encoded four ways, none of them hue: which side the bubble sits on,
 * which corner carries the small-control radius, whether the surface is blush
 * fill or card paper with a fine rule, and whether an avatar is present. That
 * redundancy is not decoration. `--wine` and `--rose` are the same value in
 * dark mode, so colour alone cannot carry the distinction, and the old wine
 * "You" / "Your partner" label spent the one accent colour once per comment —
 * on a long thread wine stopped being rare. Wine now appears exactly once
 * here, on the send button.
 *
 * The same component serves a memory page, a moment page and the photo
 * lightbox. `variant` changes spacing and width and nothing else.
 *
 * There is deliberately no autoscroll: this thread is embedded in a page
 * someone is reading, not a full-height chat viewport, and yanking the page
 * down when a comment arrives would pull the story out from under them.
 */
export function CommentThread({ access, mediaId, variant = "page", partnerName, timezone }: {
  access: EntryAccess;
  mediaId?: string;
  /** "panel" is the narrow column inside the media viewer. */
  variant?: "page" | "panel";
  partnerName?: string | null;
  /** The profile zone. Falls back to the browser's when a call site has none. */
  timezone?: string | null;
}) {
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const field = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const { kind, id, previewSession } = access;

  const zone = resolveTimeZone(timezone);
  // The name and face you chose for them; an explicit prop still wins.
  const identities = useIdentities();
  const partner = partnerName?.trim() || identities.partner.name;

  const reload = useCallback(async () => {
    try {
      const a = { kind, id, previewSession };
      let list: EntryComment[];
      if (previewSession) list = await previewComments(a, mediaId);
      else {
        const r = await (mediaId ? loadMediaComments({ ...a, mediaId }) : entryComments(a));
        if (r.error) throw Error(r.error);
        list = r.comments ?? [];
      }
      // Merged, never assigned: a partner-sync poll can land mid-send, and
      // assigning would erase a bubble the writer can still see on screen.
      setComments(current => mergePending(list, current));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [kind, id, previewSession, mediaId]);

  useEffect(() => { const t = setTimeout(() => void reload(), 0); return () => clearTimeout(t); }, [reload]);
  usePartnerRefresh(reload, pending || loading || !!previewSession);

  // role="log" is an implicit polite live region. Without this gate the whole
  // thread would be read aloud on every page open; after the first load only
  // genuinely new bubbles are announced.
  useEffect(() => { if (loading) return; const t = setTimeout(() => setSettled(true), 0); return () => clearTimeout(t); }, [loading]);

  // An on-screen keyboard's Return sending a half-written message is a real and
  // irritating failure, so Enter only submits where there is a real keyboard.
  const enterSends = useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  );

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [body]);

  async function send() {
    const text = body.trim();
    if (!text || pending) return;
    const temp = optimisticComment(text);
    setComments(current => [...current, temp]);
    setBody("");
    setPending(true);
    try {
      if (previewSession) await addPreviewComment(access, text, mediaId);
      else {
        const r = await (mediaId
          ? mediaCommentAction({ ...access, mediaId, operation: "add", body: text })
          : commentAction({ ...access, operation: "add", body: text }));
        if (r.error) throw Error(r.error);
      }
      await reload();
      setError("");
    } catch (e) {
      setComments(current => dropPending(current, temp.id));
      setBody(text); // give the words back rather than losing them
      setError(e instanceof Error ? e.message : "Could not save comment.");
    } finally {
      setPending(false);
    }
  }

  // Resolves to an error for the confirmation dialog to show, or nothing.
  async function remove(commentId: string): Promise<string | undefined> {
    setPending(true);
    try {
      if (previewSession) await deletePreviewComment(access, commentId, mediaId);
      else {
        const r = await (mediaId
          ? mediaCommentAction({ ...access, mediaId, operation: "remove", commentId })
          : commentAction({ ...access, operation: "remove", commentId }));
        if (r.error) throw Error(r.error);
      }
      await reload();
      setError("");
      setOpenId(null);
    } catch (e) {
      return e instanceof Error ? e.message : "Could not remove comment.";
    } finally {
      setPending(false);
    }
  }

  const panel = variant === "panel";
  const today = todayKey(zone);
  const groups = groupByDay(comments, zone);

  return <section
    aria-label={mediaId ? "Photo comments" : kind === "memory" ? "Memory comments" : "Moment comments"}
    className={panel ? "mt-6 border-t pt-5" : "mt-10 border-t pt-8"}
  >
    <h2 className={panel ? "font-display text-xl" : "font-display text-2xl"}>
      {mediaId ? "Comments" : "What you remember"}
    </h2>

    {loading ? <p role="status" className="mt-3 text-sm text-muted-foreground">Loading comments…</p> : null}

    {!loading && !comments.length
      ? <p className="mt-3 text-sm text-muted-foreground">Leave a little detail for each other.</p>
      : null}

    <ol role="log" aria-live={settled ? "polite" : "off"} aria-relevant="additions" className="mt-5 flex flex-col gap-3">
      {groups.map(group => <Fragment key={group.key}>
        <li aria-hidden="true" className="flex items-center gap-3 pt-2 first:pt-0">
          <span className="flex-1 border-t"/>
          <span className="text-xs font-semibold text-muted-foreground">{dayLabel(group.key, today)}</span>
          <span className="flex-1 border-t"/>
        </li>

        {group.items.map(c => {
          const sending = isPending(c.id);
          return <Fragment key={c.id}>
            <li className={cn("group flex items-end gap-2", c.mine ? "justify-end" : "justify-start")}>
              {!c.mine
                ? <Avatar name={identities.partner.name} src={identities.partner.src} style={identities.partner.style} size="sm"/>
                : null}

              {c.mine && !sending ? <button
                type="button"
                aria-expanded={openId === c.id}
                aria-label="Comment options"
                onClick={() => setOpenId(openId === c.id ? null : c.id)}
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-control text-muted-foreground",
                  "transition-opacity duration-200 motion-reduce:transition-none",
                  // Quiet but permanently present on touch, where there is no hover
                  // to reveal it; fades in on a mouse; always reachable by keyboard.
                  "pointer-coarse:opacity-70",
                  "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100",
                  "focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <MoreHorizontal className="size-4" aria-hidden="true"/>
              </button> : null}

              <div className={cn(
                "min-w-0 px-4 py-3",
                panel ? "max-w-[92%]" : "max-w-[85%] sm:max-w-[68%]",
                c.mine
                  ? "rounded-panel rounded-br-control bg-secondary text-secondary-foreground"
                  : "rounded-panel rounded-bl-control border bg-card",
                sending && "opacity-70",
              )}>
                <span className="sr-only">{c.mine ? "You wrote" : partner + " wrote"}</span>
                <p className="whitespace-pre-wrap break-words leading-7">{c.body}</p>
                {sending
                  ? <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true"/>Sending…
                    </p>
                  : <time dateTime={c.created_at} className="mt-1 block text-xs text-muted-foreground">
                      <span aria-hidden="true">{clockLabel(c.created_at, zone)}</span>
                      <span className="sr-only">{fullLabel(c.created_at, zone)}</span>
                    </time>}
              </div>
            </li>

            {openId === c.id ? <li className="flex justify-end">
              <ConfirmDelete
                variant="ghost"
                size="sm"
                label="Delete comment"
                title="Delete this comment?"
                description="It disappears from the conversation for both of you."
                onConfirm={() => remove(c.id)}
              />
            </li> : null}
          </Fragment>;
        })}
      </Fragment>)}
    </ol>

    <form method="post"
      onSubmit={e => { e.preventDefault(); void send(); }}
      className="mt-5 flex items-end gap-2 rounded-panel border bg-field p-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
    >
      <label htmlFor={field} className="sr-only">{mediaId ? "Comment on this file" : "Add a comment"}</label>
      <textarea
        id={field}
        ref={box}
        rows={1}
        value={body}
        maxLength={2000}
        placeholder="Say something to each other"
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => {
          if (e.key !== "Enter" || !enterSends || e.shiftKey || e.nativeEvent.isComposing) return;
          e.preventDefault();
          void send();
        }}
        className="max-h-40 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 leading-7 outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" aria-label="Send comment" disabled={!body.trim() || pending} className="size-11 shrink-0 px-0">
        <SendHorizontal className="size-4" aria-hidden="true"/>
      </Button>
    </form>

    {/* Below the composer, where the writer is already looking. */}
    {error ? <div role="alert" className="status-message status-error mt-3 flex flex-wrap items-center gap-x-3">
      {error}
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => void reload()}>Try again</Button>
    </div> : null}
  </section>;
}
