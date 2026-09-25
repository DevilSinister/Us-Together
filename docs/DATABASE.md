# Database Specification

## Conventions

- PostgreSQL via Supabase; schema changes occur only through reviewed migrations.
- Primary keys are UUIDs generated server/database-side. Public pairing credentials never expose them.
- Timestamps representing instants use `timestamptz` in UTC; date-only relationship/memory/milestone values use `date` where time is not meaningful.
- Currency uses ISO 4217 code plus integer minor units or a documented fixed-precision numeric strategy; never floating point.
- Every table has appropriate foreign keys, `created_at`, and where mutable, `updated_at`.
- Every exposed table has RLS enabled and explicit grants/policies.
- Authorization predicates use `(select auth.uid())` where appropriate and avoid user-editable JWT metadata.

Exact column SQL is finalized with migrations. This document defines required entities and invariants.

## Identity and tenancy

### `profiles`

One row per auth user: `user_id` unique FK, display name, avatar path/URL metadata, timezone, optional date of birth, onboarding state, timestamps. Users may update only their row; active partners may read only the non-private profile fields needed by the couple experience.

### `couples`

Name, creator, relationship start date, lifecycle state, timestamps. Couple members may read/update allowed fields. Deletion is a controlled service operation. RLS remains enabled for application roles but is not forced on the table owner, so PostgreSQL can validate foreign keys from couple-owned child records without bypassing user-facing policies.

### `couple_members`

Couple, user, role (`member` initially), joined/left timestamps, active state. Unique active membership rules must prevent duplicates. A transaction/advisory or row lock enforces at most two active members; a simple UI count is insufficient.

### `couple_invites`

Couple, creator, credential kind, strong digest, expiry, maximum/used attempts, consumed/revoked timestamps, optional intended email digest if adopted. Raw tokens/codes are never stored after issuance. Index active digest lookup and expiry cleanup.

## Dream-to-Memory domain

### `bucket_lists`, `bucket_list_items`, `bucket_item_subtasks`
Phase 4 adds monotonic item version, database-derived completion actor/time, max 100 lists per couple and max 50 steps per item. Deferrable (item_id, position) uniqueness allows atomic reorder; a parent lock/version check prevents stale overwrites. Children cannot be reparented. delete_empty_bucket_list locks and refuses populated lists; item deletion cascades steps while plan/memory source FKs become null. create_plan_from_bucket and create_memory_from_bucket lock the source and return existing linked records on retry. All new RPCs are security invokers, revoked from public/anon and granted only to authenticated users, with ownership-aware RLS providing actual authorization. Category/status/list cursor indexes support bounded UUID ordering. See ADR-015 and [verification](PHASE4_VERIFICATION.md).

Lists belong to a couple. Items include creator, list, title, description, category, priority, cost/currency, target date, location, status, completion actor/time, and timestamps. Subtasks include item, label, completed state, stable order key, and timestamps.

### `plans`, `plan_checklist_items`, `plan_reminders`

Plans include couple, creator, optional source bucket item, type/status, title/description, start/end instants, originating timezone, location/map fields, coordinates, budget/currency, and timestamps. Checklist items have stable ordering. Reminders store due instant, channel, processing state, deterministic delivery key, attempts, and delivered timestamp.

### `memories`, `memory_media`, `memory_tags`, `memory_tag_links`

Memories include couple, creator, optional source bucket/plan, title/description, date, location/coordinates, rating, favorite, and timestamps. Media contains memory, private storage path, media type, MIME, size, dimensions/duration, derivative path, creator, and timestamps. `memory_tags` is a couple-scoped tag catalog and `memory_tag_links` is the many-to-many join; tags are never encoded as an opaque JSON state.

Source relationships are nullable foreign keys. Deleting a source should normally preserve the memory and null or restrict the link according to the confirmed deletion UX; it must not cascade-delete meaningful memories.

## Personal, private, and secret data

### `wishlist_items`

User owner, couple, title/description, product URL, manual image path, price/currency, priority/category, notes, timestamps. Active couple partner may read; only owner may mutate normal fields.

Phase 7 shipped every field except the manual image, which is deferred (see below). `product_url` carries a column check requiring an `https://` prefix; nothing fetches or scrapes the page. Price is integer minor units with an ISO-4217 code, and a constraint requires the pair together or neither. A trigger makes `couple_id` and `owner_id` immutable after insert. Indexed on couple page order, couple plus owner, couple plus priority, and owner alone so an account cascade does not scan.

### `wishlist_purchase_secrets`

Wishlist item, purchaser, status, purchaser-only notes, purchased time, timestamps. Only the purchaser can select/insert/update/delete. Check purchaser differs from item owner and is an active member of the same couple. No owner-readable view or parent projection includes existence/state.

Phase 7 enforces the purchaser rule through `private.can_hold_purchase_secret`, a definer function granted only to authenticated callers and referenced by the insert and update policies, so the item owner cannot plant a probe row on their own item. Status is `planned`, `purchased`, `given` or `cancelled`; `purchased_at` is derived by trigger from status and never accepted from a client. The child cascades on item delete on purpose: `restrict` would raise an error that proves to the owner that a secret exists. There is no view, count, aggregate or notification path from an item to a secret.

### `notes`, `note_attachments`, `note_reads`

Phase 7 shipped `notes` and `note_reads`; `note_attachments` is deferred (see below). The select policy is `active member and (type = 'shared' or author = caller)`, so a private note reaches only its author and leaving the couple withdraws access to both kinds. Insert and update require authorship and validate `recipient_id` through `private.can_receive_note`; a trigger makes `couple_id` and `author_id` immutable. `note_reads` is select, insert and delete only for its own user, and its insert policy nests a select on `notes`, so a read row can only be created for a note the caller may already read. A body is stored and rendered as plain text; nothing is parsed as markup.

Notes include couple, author, optional recipient, type, title/content, reveal/delivery instants where applicable, delivery state, timestamps. MVP permits `shared` and `private`; R2 adds `surprise`, `scheduled`, and `open_when`. Attachments inherit note visibility. Read rows are created only after the user is eligible to read.

Private notes select only for author. Surprise notes select for author and, after a database-evaluated reveal condition, recipient. Shared notes select for active members. Policies and server queries must agree.

## Shared context

### `milestones`

Couple, immutable creator, title/description, date, constrained type, featured state, and timestamps. Active members can read, update, or delete shared milestones; inserts derive the creator from `auth.uid()`. Date/ID, creator, and featured access paths are indexed.

### `notifications`, `notification_preferences`

Notifications store recipient user, optional couple, constrained category, a generic non-content title, safe target type/ID, idempotency key, read time, and creation time. They deliberately do not copy shared titles, descriptions, note bodies, or other private payloads. Couple notifications remain selectable only while the recipient is both the row owner and an active member; only read state is mutable by the client. Milestone creation fans out a generic envelope to eligible partners and respects current preferences. `notification_preferences` is keyed by `user_id`, created for every auth user, and protected by owner-only select/insert/update policies.

### `audit_events`

Actor when available, couple, action, safe target type/ID, request correlation, IP/user-agent only if justified and retained briefly, timestamp. Never store credentials, tokens, content, vault PINs, private note bodies, or secret-purchase details.

## Release 2 entities

- `user_preferences`, `preference_entries`, and optional size fields with explicit partner visibility
- `vault_settings`, `vault_items`, `vault_media`, `vault_access_events`, and temporary server-side unlock sessions
- `calendar_connections`, `calendar_selections`, and `calendar_event_links` with encrypted/secured credentials and user ownership
- `push_subscriptions` and category preferences
- Search documents/projections that preserve source visibility

### Phase 7 deferrals

Two documented wishlist and note fields are deliberately unbuilt, and no column stands in for them:

- **Manual wishlist image.** Storing a user-supplied remote image URL would make the app fetch third-party hosts on render, leaking a viewer IP and referrer for a privacy-first product; storing an upload needs its own bucket and object policy. The wish shows the product link host as text instead. Revisit with the plan-attachment storage pattern.
- **Note attachments.** The same storage decision as above, and the phase gate for notes is the visibility matrix rather than attachments.

### Note notifications

`private.notify_note_visibility` fires after insert and after an update of `type`. A shared note inserts one generic `note` notification per other active member, subject to `in_app_enabled` and `notes_enabled`, keyed idempotently as `note:<id>:<user>`. A private note produces nothing. Switching a shared note to private deletes the notifications it produced for everyone except its author. No notification carries a title, body or any note content.

## Enums

Canonical application values:

- Plan status: `planned`, `completed`, `cancelled`
- Plan type: `date`, `trip`, `activity`, `birthday`, `anniversary`, `event`, `reminder`, `other`
- Bucket status: `idea`, `planned`, `in_progress`, `completed`
- Bucket priority: `low`, `medium`, `high`, `dream`
- Wishlist priority: `nice_to_have`, `want`, `really_want`
- MVP note type: `shared`, `private`
- R2 note type additions: `surprise`, `scheduled`, `open_when`
- Media type: `image`, `video`, `audio` where the owning feature permits it
- Milestone type: `relationship`, `birthday`, `anniversary`, `travel`, `achievement`, `custom`

Prefer database check constraints or enums only after considering migration flexibility. TypeScript/Zod values must be generated from or checked against the database contract.

## RLS access matrix

| Data | Select | Insert/update/delete |
| --- | --- | --- |
| Profile private fields | owner | owner |
| Partner-safe profile fields | active partner through safe query/view | owner only |
| Couple/shared records | active couple member | active member plus domain ownership rules |
| Membership | relevant member/couple member as required | controlled pairing/leave service |
| Invitation | creator; redemption through controlled operation | creator/service; no broad reads by code guessers |
| Wishlist item | owner and active partner | owner |
| Purchase secret | purchaser only | purchaser only |
| Shared note | active members | author, with explicitly allowed shared actions |
| Private note | author only | author only |
| Surprise note | author; recipient only after reveal | author until allowed lifecycle transition |
| Notification | recipient only | controlled service; recipient may mark read/delete |
| Memory media | active couple member | authorized member; storage policy mirrors metadata |
| Vault content | active member plus valid unlock authorization at server boundary | same, with stricter session checks |
| Calendar connection/event | connection owner | connection owner/service |

RLS cannot directly trust an arbitrary client unlock flag. Vault access therefore combines table/storage membership policies with a server-only, temporary unlock authorization before media URLs are issued.

## Policy requirements

- SELECT policies prevent inference before application filtering.
- UPDATE policies include both `USING` and `WITH CHECK`; protected ownership/couple columns cannot be reassigned.
- INSERT policies derive or verify creator/owner against `auth.uid()`.
- Views exposed to clients use `security_invoker = true` where supported or remain in an unexposed schema with revoked access.
- Privileged functions live outside exposed schemas where possible, set a safe search path, revoke PUBLIC execute, validate `auth.uid()`, and receive focused tests.
- Storage object paths begin with stable ownership identifiers but path shape alone never grants access.

## Index strategy

Create indexes from observed access patterns and confirm with query plans. Expected composites include:

- Active membership by `user_id` and `couple_id`
- Couple-owned collections by `(couple_id, created_at desc)`
- Plans by `(couple_id, start_at)` and status/date partial indexes where selective
- Bucket items by couple/list/status/order
- Memories by couple/date and favorite partial index if justified
- Notifications by `(user_id, read_at, created_at desc)`
- Expiring invitations/reminders/jobs by active state and due/expiry instant
- All foreign-key columns used in joins/deletes

Avoid redundant indexes and review RLS predicate indexes. Run Supabase/Postgres advisors before accepting migrations.

## Deletion and retention

- Hard deletion is appropriate for revocable credentials and explicitly deleted drafts when no audit/legal requirement exists.
- On leave, the departing membership receives `left_at` immediately and RLS access ends; shared couple data remains for the continuing active member (ADR-012).
- Hard deletion is limited to a one-member couple with no bucket lists, plans, or memories. Populated-couple deletion/export remains a later controlled workflow.
- User deletion first revokes sessions. Auth deletion alone does not guarantee existing access-token invalidation.
- Audit events retain minimal metadata for a defined period; content is never copied into them.
- Signed URLs expire naturally; storage objects and metadata are removed consistently by idempotent cleanup.

## Migration workflow

Discover the current Supabase CLI commands with `--help`. Create named migrations through the CLI, iterate locally, run advisors, reset from zero, review the diff, verify the migration list, regenerate database types, and commit migration plus generated types together. Production schema changes are never made manually without a matching migration.

## Implemented plans and memories slice

Migration `20260901024653_plans_memories.sql` establishes the normalized prerequisite bucket tables, plans/checklists/reminders, memories/tags/media, immutable couple/creator keys, same-couple provenance triggers, explicit authenticated Data API grants, operation-specific RLS policies, FK/composite/partial indexes, and the private `memory-media` bucket. Storage paths use `couple_id/memory_id/object-name`; the private policy parses both identifiers, proves that the memory matches the couple, and then checks active membership. Path shape alone never authorizes access.

That initial migration prepared reminder and media boundaries. Phase 5 now implements plan reminder jobs and plan attachments, as documented below; Phase 6 now implements memory-media upload/derivatives, as documented below.

## Implemented pairing lifecycle hardening

Migration `20260901112427_pairing_lifecycle_hardening.sql` moves privileged pairing logic into the private schema and leaves only security-invoker wrappers in `public`. It adds account and invitation attempt counters, temporary blocking, invite-creation cooldown, revocation/leave/empty-delete functions, a single self-or-partner profile SELECT policy, and indexes for previously uncovered foreign keys. Invitation rows remain RLS-enabled with no Data API table grants because all access is RPC-only. Hosted security advisors are clear of function/RLS warnings; leaked-password protection remains a project setting to enable before launch.

## Phase 5 implementation

Plans have a monotonic integer version advanced by parent/child mutations. `mutate_plan(jsonb)` and `update_plan_details(jsonb)` are security-invoker APIs, accept public IDs/revisions only as lookup/check values, and lock the authorized parent. Completed actor/time are derived from auth.uid()/database time. Checklist positions use a deferred unique constraint, and parent IDs cannot be changed. Checklist/reminder inserts serialize on the parent and enforce limits.

Reminders add offset_minutes (0–43200), next_attempt_at, and last_error_code. One offset is unique per plan. The private scheduled worker takes bounded SKIP LOCKED claims, authorizes fan-out through current membership and preferences, commits each reminder atomically, and deduplicates by delivery_key plus recipient. It retries with exponential backoff and reaches failed after five failed attempts. No content or raw exception text is copied into notification/job state.

`plan_attachments` stores normalized per-file metadata with an immutable generated path, uploader FK/index, signature-compatible MIME class, size (1–2097152 bytes), and ready state. Exposed table RLS and private Storage policies authorize the exact attachment/plan/member relationship. The private security-definer Storage predicate is exceptional: it checks non-null auth.uid(), exact metadata/path and active membership; default execution is revoked. Normal mutations and worker functions are security invokers.

Attachment deletion checks that its Storage object is gone. The plan FK restricts deletion until attachments are removed; Phase 8 account/couple deletion must perform Storage cleanup first. Plan deletion continues preserving memories through nullable source FKs. Collection limits: 50 checklist items, five reminders, 20 attachments.

See [Phase 5 evidence](PHASE5_VERIFICATION.md) for migration correspondence, hosted assertions, indexes and integration boundaries.

## Phase 6 implementation

Memories now carry a monotonic version. The security-invoker `update_memory_details(jsonb)` locks the authorized parent, checks the supplied revision, and atomically changes story fields and normalized tags. Dates must be real calendar dates. Optional latitude/longitude must be supplied together within the existing numeric range constraints; the coordinate follow-up migration includes 42 rollback-only authorization assertions. Tags use trimmed lowercase names, at most eight links per memory and 500 catalog rows per couple. A transaction advisory lock serializes catalog capacity without requiring members to update the couple row. `list_memories_by_tag` is a bounded security-invoker lookup; the gallery applies date/UUID cursors and a twelve-row page.

Memory provenance cannot be reassigned. A new source-plan link requires a completed plan in the same couple; source deletion may still clear nullable provenance. Shared memory access follows active membership, including retained shared content after a partner leaves.

Media metadata has immutable allocation identity/path, caption, upload expiry, pending/processing/ready/failed/deleting state, processing timestamp/token and safe error code. Authenticated clients can read authorized metadata but cannot directly write it. The Edge handler owns writes after fresh user and parent authorization. Row triggers serialize quota checks on the memory: thirty files and 300 MiB total, including unfinished uploads.

Storage policies now authorize exact allocated metadata, replacing the earlier prefix-only relationship check. Only its active uploader can insert the pending original before expiry. Private security-definer predicates use fixed search paths, revoked default execution, explicit identity/membership checks and narrow grants; the upload predicate locks the metadata during the Storage transaction. Browser overwrite/delete is unavailable. Ready files are readable by current members. Metadata deletion requires original/derivative objects to be absent; the memory FK restricts deletion while media remains.

The private RLS-protected `media_request_budgets` table supports an identity-derived security-invoker RPC: sixty allocations/hour, 120 processing requests/hour and 120 application viewer authorizations/minute. Rows are scoped to auth.uid(); no actor ID is accepted.

Phase 6 fixture setup/cleanup migrations contain generated fictional identities only and are paired. Hosted verification migrations execute assertions in rolled-back inner subtransactions with explicit no-leftover postconditions. See [Phase 6 evidence](PHASE6_VERIFICATION.md).

## Phase 6 shared calendar / moments extension

milestones adds bounded location text. milestone_media mirrors the verified memory-media state machine and immutable path/creator/size identity, with a milestone FK and creator FK. The moment-media bucket is private. Authenticated metadata is SELECT-only; exact-path Storage INSERT is allowed only for the allocating owner while pending and unexpired. Both partners can read verified media while active; former/foreign members cannot. Stored objects must be removed before metadata deletion. Parent locking serializes the 30-file/300-MiB quota.

entry_comments has exactly one memory_id/milestone_id FK, body length 1–2000, authenticated author and creation time. Active members read/add; only the author deletes; no UPDATE grant. A parent lock enforces 500 comments. Parent deletion cascades comments.

entry_reminders is retired. Historical rows remain, but authenticated/anonymous table access and RPC execution are revoked, the entry cron is removed, and private.deliver_entry_reminders(integer) returns zero. The separate plan_reminders table, RPCs and private.deliver_due_plan_reminders worker remain active.

The existing private media_request_budgets relation also supports location lookup (60 requests/minute/account). Preview uses a 30/minute session cap and the server prevents provider bursts. The copied milestone-media creator index is retained; its duplicate was removed following the advisor finding.

Legacy latitude/longitude database columns and historical migrations remain for compatibility. Current forms, DTOs and memory mutations do not expose or collect manual coordinates. No existing coordinate data was destructively dropped.

### Shared gallery and per-file comments

media_comments has exactly one memory_media_id/milestone_media_id FK with ON DELETE CASCADE, a server-derived author FK, body and creation time. Indexed parent/time/UUID and author columns support bounded reads and cleanup. Ready media visibility is checked by a security-invoker helper over the underlying media RLS. Active partners read/add; only the author deletes. No UPDATE privilege is granted. An advisory lock serializes the 500-comment quota per file.

shared_gallery is a security-invoker UNION ALL view over ready memory_media/milestone_media and authorized parents. It exposes safe metadata, story title/date, parent ID, kind and a deterministic sort key. Authenticated SELECT only; no public access. Base ownership/date/media indexes remain in use.

## Bucket list limit trigger repair


### Drawing notes extension — 2026-09-16

`drawing_notes` is separate from editable `notes`. It records an immutable couple, author, other active recipient and exact author/id PNG path. A pending row is visible only to its author; a ready row is visible to the author and recipient while each remains an active member. The transition checks that the Storage object exists and stamps `sent_at`; ready rows cannot update or delete. The private `drawing-notes` bucket accepts only PNG files up to 2 MB. Storage policies authorize pending uploads by author and reads by active row visibility. `drawing_devices` stores FCM tokens under owner-only RLS; it contains no note content. The server-only sender reads recipient tokens with a secret key after an authorized send. Latest-recipient and history indexes support bounded queries. Hosted migrations: `20260917013807_drawing_notes.sql` and `20260917014059_drawing_notes_author_index.sql`. Both are applied; the author index covers its foreign key.

## Partner activity envelopes — 2026-09-17

Migration `20260917144048_partner_activity_notifications.sql` adds fixed-copy notifications for partner-visible bucket lists and ideas, plans, checklists, reminders, ready attachments, memories, moments, ready photos/videos, comments, wishlist items, shared-note edits, and sent drawings. Existing milestone creation, shared-note creation and scheduled deliveries remain separate. The trigger derives the active partner at commit time, skips the actor, respects category preferences, and stores no user-entered title, body, file path or secret. Pending media/attachments and drawings do not notify. Purchase-secret and private-note rows have no activity trigger. Deleting a shared target removes its envelopes. `public.mark_notification_read(uuid)` is a security-invoker POST RPC with recipient RLS.

Migration `20260925145349_partner_activity_detail.sql` makes that fixed copy say what happened. Titles now distinguish added, edited, completed and deleted (`New memory added`, `A plan was edited`, `A bucket idea was completed`, `A wish was deleted`), and comments name what they are on. Deleting a memory, moment, plan, bucket list, bucket idea, wish or shared note notifies the partner with a target-less envelope that links to its section; a deletion is credited only to `auth.uid()`, so cascades, service-role jobs and a couple that is itself being deleted notify nobody. Photos and videos that become ready on the same entry within fifteen minutes coalesce into one unread row: `notifications.activity_count` rises, the title becomes `3 new photos added to a memory`, and the row's `fcm_deliveries`/`push_deliveries` are reset to pending so the device replaces its alert (tag = notification id). Repeated edits to one record raise one unread `... was edited` row per thirty minutes. Moments and shared notes gained the cleanup trigger the other targets already had. Media removal still does not notify: the `memory-media` Edge Function deletes with the service role, so the database cannot tell who removed a file.


Hosted application: version `20260917144048` is in the Us-Together ledger. Readback confirmed 16 activity triggers, all three preference columns and a security-invoker mark-read RPC with no anonymous EXECUTE grant. Security/performance advisors had the same findings before and after this migration. Negative RLS fixtures remain unrun on production.

## App section locks — 2026-09-17

Hosted migration `20260917150133_app_section_locks.sql` creates private per-user code hashes, selected areas and unlock rows keyed by auth JWT `session_id`. Code checks use pgcrypto bcrypt and five failed attempts impose a 15-minute cooldown. Public status/open/configure/verify/unlock/lock RPCs are authenticated-only wrappers. Twenty-two restrictive SELECT policies gate selected content tables and private Storage objects in addition to existing ownership policies. Media requires Gallery and its source entry area to be open. Unlocks last five minutes, and configuration changes revoke all current unlock rows. The private tables are outside the exposed API schema and have no client table grants.

## Note it polish — 2026-09-20

`20260920195724_drawing_reads_and_note_paging.sql` adds `drawing_reads(drawing_id, user_id, read_at)`, a recipient-only record that a ready drawing was opened. It mirrors `note_reads`: owner-only SELECT/INSERT/DELETE policies, the INSERT policy additionally requiring a ready `drawing_notes` row addressed to the caller, and **no UPDATE grant**, because the application writes `ON CONFLICT DO NOTHING`. The same migration adds `notes_couple_updated_idx (couple_id, updated_at desc, id desc)` for keyset paging of `/notes`. pgTAP: `supabase/tests/database/0012_drawing_reads_rls.test.sql`.

`20260920195802_fcm_deliveries.sql` is the Android transport, shaped like Phase 8's Web Push. `fcm_deliveries(notification_id, token → drawing_devices, state, attempts, next_attempt_at, last_error_code, delivered_at)` with `unique (notification_id, token)`; RLS enabled and forced with no application grants. `private.enqueue_fcm_for_notification()` runs `AFTER INSERT ON notifications` and inserts one row per registered device of the recipient. `private.dispatch_due_fcm(int)` claims due rows `FOR UPDATE SKIP LOCKED`, marks them dispatched with exponential backoff (capped at 15 minutes), and `net.http_post`s the envelope to the Vault secret `fcm_endpoint_url` with the shared `push_dispatch_secret`; it returns 0 while either secret is absent. `public.settle_fcm_deliveries(jsonb)` is `security definer`, executable by `service_role` only: `delivered` records the state and bumps `drawing_devices.last_seen_at`; `gone` deletes the device row so the cascade clears its deliveries; anything else retries up to five attempts. Cron job `us-together-fcm-dispatch` runs every minute. `drawing_devices` is commented as the Android device registry for every category; a token's presence is the opt-in. pgTAP: `0013_fcm_deliveries.test.sql`. Both migrations end with `notify pgrst, 'reload schema'`.

Hosted application status for both migrations is recorded in `docs/DRAWING_NOTES_VERIFICATION.md`; the files exist locally first, and dependent web code must not deploy before they are applied.

### PIN flow migration

`20260917163417_privacy_pin_flow.sql` is applied. New PIN hashes accept exactly four or six digits and record `pin_length`; earlier hashes have a null length and remain checkable during migration. `app_lock_change_code(current_code,new_code)` verifies the current code with the existing cooldown, hashes the new PIN with bcrypt, updates length and revokes all unlock rows atomically. `app_lock_status()` now returns `pin_length`. The public change RPC is security-invoker, authenticated only.

## `partner_presentations` (2026-09-22)

One owner-scoped row per account, holding the name, picture and colour that account chose **for** its partner. `owner_id` is the primary key and references `auth.users`; `display_name` is capped at 80 characters; `avatar_path` is constrained to `owner_id::text || '/%'` so a recorded path can only name an object inside its owner's own folder; `avatar_style` is one of `rose`, `wine`, `blush`, `plum`; `confirmed_couple_id` references `couples` with `on delete set null`.

RLS is enabled **and forced**, all privileges are revoked from `anon`, and `authenticated` receives SELECT/INSERT/UPDATE/DELETE gated by four own-row policies — the UPDATE policy carrying both `USING` and `WITH CHECK`. There is no security-definer function. Deliberately there is **no** foreign key to a partner user id: the row must be able to exist before the partner has an account, and binding it to a user would make it a record about them.

`profiles` gains `avatar_style` (`not null default 'rose'`, same four values) and the check constraint `profiles_avatar_path_own_folder`, added `NOT VALID` and validated separately so the live table is not scanned under an exclusive lock.

The `avatars` bucket is unchanged and keeps its four own-folder-only policies. See ADR-034 for why the presentation cannot live on `profiles`.

## Dream lived-on date and one entry per story (`20260925153346_dream_lived_on.sql`)

`bucket_list_items.lived_on` (`date`) is the calendar day a dream was lived. The check constraint `bucket_lived_on_when_completed` makes it present exactly when `status = 'completed'`. `private.bucket_item_revision` sets it to the member's own today (from `profiles.timezone`, UTC fallback) when an idea is completed without a day, keeps it across later edits, and clears it on reopen. Existing completed dreams are backfilled from their direct memory's `memory_date`, else `completed_at::date`, with user triggers disabled so no partner notification is raised.

`private.sync_dream_lived_on` (security invoker, `search_path = ''`, execute revoked from `public`, `anon`, `authenticated`) keeps a dream and the memory saved directly from it (`source_bucket_item_id` set, `source_plan_id` null) on one day in both directions; each side writes only when the day differs, so the pair terminates.

`public.story_entries` now dates the dream branch by `lived_on` and leaves out a dream or completed plan once any memory references it; that memory is the single entry. `bucket_items_couple_completed_story_idx` is replaced by `bucket_items_couple_lived_story_idx (couple_id, lived_on desc, id desc) where status = 'completed'`.
