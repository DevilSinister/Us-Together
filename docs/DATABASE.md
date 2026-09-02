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

Name, creator, relationship start date, lifecycle state, timestamps. Couple members may read/update allowed fields. Deletion is a controlled service operation.

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

### `wishlist_purchase_secrets`

Wishlist item, purchaser, status, purchaser-only notes, purchased time, timestamps. Only the purchaser can select/insert/update/delete. Check purchaser differs from item owner and is an active member of the same couple. No owner-readable view or parent projection includes existence/state.

### `notes`, `note_attachments`, `note_reads`

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
