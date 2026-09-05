# Phase 7 verification — wishlists and notes, 2026-09-04

> Status update — 2026-09-05: the owner confirms manual testing of Phase 7, account creation, linking and sync. Keep current gallery changes; previous gallery follow-up is not an active task. Account lifecycle is on hold. Historical results below remain evidence for their date; outstanding implementation/automated checks are tracked in the [Release 2 backlog](release-2/BACKLOG.md) and [verification ledger](release-2/VERIFICATION.md), not claimed passed.

## Behavior

### Wishlists

Each wish belongs to one member and to the couple. Both active members read every wish; only its owner changes or removes one. Fields are title, description, an `https://` product link, price in integer minor units with an ISO-4217 code, category, priority from `nice_to_have|want|really_want`, and notes. Nothing fetches or scrapes a product page. A trigger makes owner and couple immutable after insert.

The wishlist page shows two columns: yours, labelled so you know your partner can read it, and theirs, with a private gift plan on each of their wishes.

### Purchase secrets

A gift plan belongs to the purchaser alone. Status is `planned|purchased|given|cancelled` and `purchased_at` is derived by the database from status, never accepted from a client. `private.can_hold_purchase_secret` requires the caller to be an active member of the item's couple **and not its owner**, so nobody can plant a probe row against their own wish.

The owner-facing side of this feature is the absence of one. There is no view, projection, aggregate, count, notification, or preference anywhere that joins a wish to a secret, and the server returns a single generic message whether a probed item was missing or forbidden.

### Notes

MVP types are `shared` and `private`. A shared note is readable by both active members; a private note only by its author, even though the schema carries a recipient column. The select policy is `active member and (type = 'shared' or author = caller)`, so leaving the couple withdraws access to both kinds. Insert and update require authorship and validate any recipient through `private.can_receive_note`; a trigger makes couple and author immutable.

Bodies are stored and rendered as plain text. No path parses note content as markup.

`note_reads` records per-user read state. Its insert policy nests a select on `notes`, so a read row can only be created for a note the caller may already read.

### Notification audit

`private.notify_note_visibility` inserts one generic `note` notification per other active member when a note becomes shared, honouring `in_app_enabled` and `notes_enabled`, keyed idempotently. A private note produces nothing. Switching a shared note to private deletes the notifications it produced for everyone but its author. No notification carries a title, body, or any note content. Wishlists produce no notifications at all, so no notification channel exists that could correlate with a gift plan. The Notifications inbox routes a `note` target to its note.

### Home

Home now previews the most recent note the viewer is allowed to read — visibility is decided by row level security, so a partner's private note never arrives — and a count of the couple's wishes. The privacy panel copy was corrected to state exactly what Home reads and that a partner private note and any gift plan are never counted, previewed, or copied into notifications.

## Evidence

- Migration `phase7_wishlists_notes` applied to the hosted project: four tables, 15 policies, seven triggers, and 11 indexes. Verified after application that RLS is enabled **and forced** on all four tables.
- Migration `phase7_verification` ran **52 pgTAP assertions** and passed. The suite raises on any `not ok`, then raises `P7444` and catches it so every fixture rolls back; confirmed afterwards that zero fixture users, wishlist rows, secret rows, notes, note reads, note notifications, or fixture couples remain.
- The suite covers each mandatory negative scenario for this phase. The owner is denied the secret by exact id, by their own item id, by an explicit join, by a status count, and by an instant aggregate; cannot plant a probe row; and their denied update and delete raise nothing while leaving the row untouched. Deleting the item succeeds without a restrict error, and the secret cascades. The partner is denied a private note by id and by a content probe, cannot record a read for it, and a denied note edit changes nothing. A stranger reads nothing from either feature. A former member loses access to both. Anonymous has zero privileges on all four tables and cannot execute either helper function.
- Notification assertions: a private note notifies nobody, a shared note notifies the partner exactly once and not its author, the title is the generic line, no note body reaches a notification title, and withdrawing sharing removes the partner notification.
- Migration `phase7_foreign_key_indexes` applied after the performance advisor flagged four uncovered cascade targets (`note_reads.user_id`, `notes.author_id`, `notes.recipient_id`, `wishlist_items.owner_id`). Re-check shows only the expected "unused index" notices for brand-new tables.
- Security advisors: no new findings. The three that remain are pre-existing and unrelated — the Phase 6 fixture table, the deliberately policy-less `couple_invitations`, and the account-level leaked-password setting.
- Generated database types were regenerated from the hosted schema and the four new tables patched into `src/lib/supabase/database.types.ts`.
- `npm run lint`, `npm run typecheck`, `npm run test` (**78 tests, 12 files**, up from 53) and `npm run build` all pass. The production route table gained eight routes: `/notes`, `/notes/new`, `/notes/[id]`, `/notes/[id]/edit`, `/wishlist`, `/wishlist/new`, `/wishlist/[id]`, `/wishlist/[id]/edit`.
- New unit tests assert the money conversion to minor units, the price-and-currency pairing rule, rejection of `http://` and `javascript:` product links, rejection of an undocumented priority or purchase status, that neither input schema accepts a caller-supplied purchaser, author, or couple, that note types are limited to the two MVP values, and that note bodies containing markup survive as literal text.
- Browser check against a dev server: 12 navigation destinations across the three documented groups with zero duplicate icons; both new pages render with the shared page header and pairing notice; at 390x844 the phone bar keeps five targets and the More dialog holds all eight remaining destinations without scrolling and without horizontal overflow.
- Secret scan across 30 changed and added files: zero findings. `git diff --check` passes. No logging was added, and no `console` statement exists in any new source file.

## Scope and remaining gates

**No browser journey exercises the signed-in wishlist or note forms.** By ADR-023 these surfaces have no developer-preview store, and the local dev-login fixture is the only signed-in session available here, so the preview correctly shows the pairing notice instead of a form. The forms are covered by types, lint, build, and the hosted assertion suite, but a real two-account journey is outstanding. No Playwright specs were added for this phase, and the existing suite still cannot run on this machine (no Chromium installed — see the consistency verification for detail).

Deliberately deferred, recorded in `docs/DATABASE.md`:

- **Manual wishlist image.** A remote image URL would make the app fetch third-party hosts on render, leaking viewer IP and referrer for a privacy-first product; an upload needs its own bucket and object policy. The wish shows the product link host as text instead.
- **Note attachments.** Same storage decision, and the phase gate for notes is the visibility matrix rather than attachments.

Neither is stubbed: no column, control, or copy implies a capability that does not exist.

Also open, unchanged by this phase: clean migration replay from zero, genuinely concurrent-session checks, real two-account pairing, and the Phase 6 fixture-account cleanup. Applied migration version stamps differ from local filenames because migrations are applied through the management API; names and ordering match, and this drift predates Phase 7.
