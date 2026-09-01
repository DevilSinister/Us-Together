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

Lists belong to a couple. Items include creator, list, title, description, category, priority, cost/currency, target date, location, status, completion actor/time, and timestamps. Subtasks include item, label, completed state, stable order key, and timestamps.

### `plans`, `plan_checklist_items`, `plan_reminders`

Plans include couple, creator, optional source bucket item, type/status, title/description, start/end instants, originating timezone, location/map fields, coordinates, budget/currency, and timestamps. Checklist items have stable ordering. Reminders store due instant, channel, processing state, deterministic delivery key, attempts, and delivered timestamp.

### `memories`, `memory_media`, `memory_tags`

Memories include couple, creator, optional source bucket/plan, title/description, date, location/coordinates, rating, favorite, and timestamps. Media contains memory, private storage path, media type, MIME, size, dimensions/duration, derivative path, creator, and timestamps. Tags are relational; do not encode the collection as an opaque JSON state.

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

Couple, creator, title/description, date, type, featured state, timestamps.

### `notifications`

Recipient user, couple, type, title/body, safe reference type/ID, read time, timestamps. Creation services must prove the recipient may discover the referenced record. Secret records cannot be referenced.

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
- Shared couple data requires a documented choice during leave/delete: ownership transfer, retained shared access, export then deletion, or scheduled deletion. Implementation must not invent this silently.
- User deletion first revokes sessions. Auth deletion alone does not guarantee existing access-token invalidation.
- Audit events retain minimal metadata for a defined period; content is never copied into them.
- Signed URLs expire naturally; storage objects and metadata are removed consistently by idempotent cleanup.

## Migration workflow

Discover the current Supabase CLI commands with `--help`. Create named migrations through the CLI, iterate locally, run advisors, reset from zero, review the diff, verify the migration list, regenerate database types, and commit migration plus generated types together. Production schema changes are never made manually without a matching migration.
