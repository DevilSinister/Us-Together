# API and Server Contracts

## Principles

- Server Actions are the default first-party mutation interface; Route Handlers handle callbacks, webhooks, exports, uploads/signing, and explicit HTTP endpoints.
- Contracts use Zod schemas shared only where doing so does not pull server secrets/code into clients.
- Authenticated identity is derived on the server. Inputs do not accept trusted `user_id`, `created_by`, arbitrary `couple_id`, or storage ownership.
- Responses return domain-safe DTOs, never raw tables with hidden columns.
- Expected errors use stable codes and user-safe messages; logs use correlation IDs and protected detail.

## Common result model

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code:
          | "VALIDATION_ERROR"
          | "UNAUTHENTICATED"
          | "NOT_FOUND"
          | "CONFLICT"
          | "RATE_LIMITED"
          | "EXPIRED"
          | "UPLOAD_REJECTED"
          | "INTEGRATION_ERROR"
          | "INTERNAL_ERROR";
        message: string;
        fieldErrors?: Record<string, string[]>;
        retryAfterSeconds?: number;
        correlationId?: string;
      };
    };
```

Authorization failures may map to `NOT_FOUND` when `FORBIDDEN` would disclose a private record. Detailed causes never go to the client.

## Identity and couple actions

| Contract | Input | Output and invariants |
| --- | --- | --- |
| `updateProfile` | display name, timezone, optional avatar reference/DOB | Current user's profile only |
| `createCouple` | name, optional relationship date | Couple plus creator membership, idempotent request key |
| `createCoupleInvite` | kind and lifetime within server limits | Raw token/code returned once; digest stored |
| `revokeCoupleInvite` | invite public reference | Creator/current member only |
| `redeemCoupleInvite` | raw token/code | Transactionally validates capacity, attempts, expiry, and use |
| `leaveCouple` | confirmation/recent-auth proof | Applies documented shared-data policy |
| `deleteAccount` | strong confirmation/recent-auth proof | Revokes sessions and starts idempotent deletion workflow |

Pairing verification and redemption are rate-limited by account, credential digest, and network signals as appropriate. Attempt counts update atomically.

Implemented now: public Data API functions are security-invoker wrappers around revoked, authenticated private-schema implementations. `create_couple_with_invite` and `create_pairing_invite` issue a raw six-digit code once while storing only SHA-256; invite creation has a one-minute account cooldown. `join_couple_by_code` uses an atomic ten-minute account window with a fifteen-minute block after repeated attempts plus a per-invitation maximum, returning one generic invalid/expired/blocked result. `revoke_pairing_invite`, `leave_current_couple`, and `delete_empty_couple` implement ADR-012. Network-signal throttling remains an application/edge concern before public launch.

## Bucket and plan actions

Phase 4 list/item/step actions return { ok, message, id? }. filterBucketItems validates list/status/priority/category/cursor and returns { page?, error? }, with 12 rows and a next UUID cursor. Filters stay in the request body. List/item deletion requires literal DELETE; lists must be empty. Conversion forms prefill content but commit only on submit. Completed-idea memory creation calls create_memory_from_bucket; both conversion RPCs are security invokers and retry on source identity. No supplied actor/couple field is accepted.

- Implemented `mutateBucket(unknown)`: discriminated Zod operations `createList`, `renameList`, `deleteList`, `createItem`, `updateItem`, `deleteItem`, `completeItem`, `subtask`
- `subtask` kinds `add`, `update`, `delete`, `reorder`: item UUID/version and complete ordered-ID permutation; server session supplies identity; database locks/checks the parent
- `completeItem` uses item UUID and expected version; an already-completed item returns success without duplicate completion
- `createPlan`, `updatePlan`, `cancelPlan`, `deletePlan`
- `createPlanFromBucketItem` returning the existing link on safe retry
- `completePlan`

Inputs accept public record IDs only as lookup keys. The server loads the row under RLS and checks couple membership. Date inputs include ISO instants and IANA timezone when local interpretation matters. Money input is validated as currency plus minor units/fixed precision.

Implemented now: `createPlanAction` derives an active couple membership from the authenticated session, validates form data with Zod, resolves local date/time through the supplied IANA timezone, rejects DST gaps and invalid intervals, converts money to integer minor units, and creates only an RLS-visible row. `mutatePlan` validates a discriminated operation and expected parent version, then calls the security-invoker `mutate_plan` RPC. The RPC locks and reloads the plan under RLS; completion actor/time are derived from the authenticated database session. With `sourceBucketId`, `createPlanAction` instead calls the RLS-protected, source-locking `create_plan_from_bucket` RPC and returns the existing linked plan on retry. Any active membership can operate on retained shared ideas, including the continuing member after leave. `updatePlanAction` validates local times, timezone, optional location/HTTPS map link, budget/currency and revision, then calls `update_plan_details`. `filterPlans` accepts view/date/status plus a validated date/UUID cursor in the request body; pages contain at most 30 upcoming rows or 250 calendar candidates. Exact viewer-day classification happens after a bounded query; a next cursor makes additional rows reachable. `mutatePlan` handles lifecycle, confirmed delete, checklist add/edit/delete/full-permutation reorder, and reminder add/remove. Failed revisions return an explicit refresh message.

## Memory and media contracts

- `createMemory`, `updateMemory`, `deleteMemory`
- `createMemoryFromSource` with bucket/plan provenance and idempotency
- `requestMediaUpload` validates feature, owner, MIME, extension, size, and intended path before returning constrained upload authorization
- `finalizeMediaUpload` verifies stored object metadata before creating/publishing a media row
- `deleteMedia` authorizes metadata and object together
- `getMemoryMediaUrl` returns a short-lived signed URL after authorization

Client-supplied storage paths are never used directly. Upload/finalize has an expiry and cannot attach an object from another couple or feature.

Implemented now: `createMemoryAction` supports direct creation and completed-plan provenance. The server reloads a source plan under RLS, requires completion, derives its couple, and returns the existing memory on a safe retry. Phase 6 adds `updateMemoryAction` with expected version and normalized tags, `deleteMemory` with UUID/version/literal DELETE, and `filterMemories` with favorite/tag/date-UUID cursor. Edits call security-invoker `update_memory_details`; tagged pagination calls `list_memories_by_tag`. Tags and filters remain in request bodies. Rows are bounded to twelve plus one lookahead.

`memoryMediaAction` validates a prepare/finalize/remove discriminated Zod request and invokes the authenticated `memory-media` Edge Function. Prepare accepts memory UUID, filename/MIME/size/caption and returns a newly authorized media UUID/path/expiry for transient upload use. It accepts no actor, tenant or caller path. Finalize/remove accept only memory/media UUIDs. The Edge Function authenticates with `getUser`, resolves the parent under caller RLS, then uses its built-in service role for tightly scoped metadata/Storage operations. Authenticated clients cannot write media metadata or overwrite/delete objects. See [media operations](PHASE6_OPERATIONS.md) for limits, state transitions, leases and recovery.

`GET /api/memory-media/[id]?kind=memory|moment&variant=original|preview|download` reauthorizes the caller and ready row, consumes an account viewer budget, and emits a no-store/no-referrer redirect to a 60-second signed URL. Gallery/detail DTOs never contain raw paths or signed URLs. Previously issued URLs remain valid until expiry. `consume_memory_media_budget(kind)` is security-invoker and derives the budget owner from auth.uid; its backing relation is in the unexposed private schema.

## Wishlist and note actions

- `createWishlistItem`, `updateWishlistItem`, `deleteWishlistItem`
- `markWishlistPurchased`, `updatePurchaseSecret`, `clearPurchaseSecret`
- `createNote`, `updateNote`, `deleteNote`, `markNoteRead`
- R2: `scheduleNote`, `cancelScheduledNote`, `openOpenWhenNote`

Purchase-secret results are returned only to the purchaser and never embedded in wishlist-owner DTOs. Note DTO selection is type-specific; pre-reveal surprise records do not appear to recipients.

## Notifications and dashboard reads

Dashboard data is composed server-side from individually authorized queries or security-invoker projections. It returns only display-ready safe summaries. Notification references are dereferenced only if the recipient can still access the target; otherwise the notification is removed or shown without leaking content.

Implemented Phase 3 server actions are `createMilestoneAction`, `markNotificationReadAction`, and `updateNotificationPreferencesAction`. Each derives identity and ownership from the authenticated server session, validates form boundaries, relies on RLS for the final row check, and revalidates only affected routes. The Home projection reads only allow-listed shared tables; private and secret candidate classes are filtered before relevance selection and never affect counts. Notification records contain a generic event title and target pointer, so opening the target performs a fresh authorization check rather than trusting inbox content.

## Route Handlers

Planned endpoints include:

- Auth/recovery callback if required by the chosen current Supabase pattern
- Google OAuth start/callback/disconnect (R2)
- Storage upload authorization/finalization where Server Actions are unsuitable
- Protected media URL/stream authorization, especially Vault (R2)
- Data export creation/status/download
- Scheduled/webhook endpoints protected with platform authentication and replay controls
- Health/readiness endpoints that expose no secrets or tenant state

State-changing cookie-authenticated handlers enforce same-origin/CSRF protections appropriate to the current framework. OAuth state, PKCE where applicable, nonce, redirect allow-listing, and single-use callback handling are mandatory.

## Idempotency and concurrency

Use idempotency for invite acceptance, conversion, completion, notifications, scheduled delivery, export creation, and external event creation. A durable unique key ties the actor, operation, and logical target. Concurrent updates use row locks, unique constraints, or versions according to the invariant; “check then insert” without database enforcement is insufficient.

## Pagination

Growing collections use bounded cursor pagination based on stable ordering such as `(created_at, id)` or domain date plus ID. Never fetch an entire vault, memory gallery, activity feed, or notification history. Search results preserve source authorization and pagination.

## External interfaces

Google Calendar DTOs do not expose OAuth tokens to the browser. Provider errors are mapped to disconnected, reauthorization-required, rate-limited, or transient states. Future AI receives a provider-neutral request containing only explicitly approved, minimized context.

## Phase 5 attachments and reminders

`uploadPlanAttachment(previous, FormData)` accepts only planId and File. It reauthorizes the plan, validates PDF/PNG/JPEG signature and a 2 MiB maximum, generates both attachment ID and object path server-side, writes pending metadata, uploads without upsert, then marks ready. Failure retains a removable unfinished upload. `deletePlanAttachment({id,planId})` reauthorizes both and deletes Storage before metadata.

`GET /api/plan-attachments/[id]` returns an authorized attachment download with private/no-store caching and no raw storage URL; unavailable/unauthorized IDs return 404. It checks ready state and the binary signature again. Runtime exceptions return generic messages and do not expose private paths or content.

Reminder controls choose offsets relative to plan start. Cancel/complete stops pending reminders; editing start reschedules pending offsets. Only the trusted private worker can record delivery, attempts, retry timestamps and failure class. Generic inbox links open `/plans/[id]` for a fresh membership check. See [reminder operations](PHASE5_OPERATIONS.md).

## Phase 6 shared-entry extension

- createMemoryAction and createMilestoneAction accept validated returnCreated=true to return a savedId for subsequent file uploads; ordinary submissions redirect to detail. Ownership remains derived server-side. File blobs never travel in these Server Action forms.
- memoryMediaAction / memory-media accept kind=memory|moment (default memory) and prepare/finalize/remove/caption. Caption edits authorize the parent and bounded text before privileged metadata writes.
- entryMedia and entryComments reauthorize the UUID/kind, return bounded safe DTOs, and never expose storage paths. commentAction validates add/remove, derives author from the session and permits removal only by that author.
- Entry-reminder actions are removed. The database RPC is revoked from authenticated callers; the retired worker returns zero and its cron job is unscheduled. Plan reminder interfaces are unchanged.
- loadSharedCalendar validates month/week/date and independent per-source cursors. Each request reads at most 251 candidates per source and returns 250 with explicit lookahead; all rows remain under parent RLS.
- searchPlaces accepts status, search (3–200 characters), or nearby (bounded numeric geolocation). The selected place name is stored; coordinates and provider responses are not. The provider base is server-configured, not client-controlled. Errors are generic and request content is not logged.
- The former /api/preview-reminders route and preview pump are removed.

### Gallery and per-file comments

- loadGallery accepts source kind (all/memory/moment), media type (all/image/video), optional entry UUID (requires memory or moment kind), optional ISO story date and optional date/kind-UUID cursor. Entry scoping adds an entry_id equality constraint while preserving couple RLS; malformed gallery URL parameters return 404. It derives the couple from the server session and returns at most 48 ready media DTOs plus a next cursor. Preview returns authorized entry descriptors; files remain in IndexedDB.
- loadMediaComments accepts kind, parent UUID and media UUID. It verifies a ready file belongs to that authorized parent and returns up to 500 comments, containing id/body/time and a mine boolean.
- mediaCommentAction accepts that target plus add/remove, body (1–2000 trimmed characters) or comment UUID. Author identity is server-derived; delete is constrained by author and file. Both partners may add comments. Updates are unavailable.

### Bucket list browsing routes

- `/bucket` loads the authorized list directory, with no mixed idea feed.
- `/bucket/lists/[listId]` awaits route params, validates the UUID with Zod and requires the ID in the existing session-authorized list result before loading a bounded page of ideas. Missing, malformed and inaccessible lists return 404.
- `/bucket/new?list=<UUID>` validates the optional UUID and checks the same authorized list result before preselecting it. The existing server mutation independently validates membership and list ownership. List and idea text never enter route parameters.
- Filter resets preserve the opened list. Existing bucket mutations invalidate `/bucket/lists/[listId]` as a page pattern; mutation inputs, schemas and database policies are unchanged.

### Wishlists and purchase secrets

- saveWishlistItem accepts an optional item UUID plus title (1-160 trimmed), description, product URL, price string, currency, category, priority and notes. A decimal amount becomes integer minor units; the currency is upper-cased; price and currency are required together or not at all. A product URL must match `https://`; nothing fetches the page. Owner and couple are derived from the server session and never accepted from the caller. An update without owner rights matches no row and returns the same generic message as a missing item.
- deleteWishlistItem accepts an item UUID. Only the owner matches a row. The purchase secret cascades silently, so a partner gift plan disappears with the wish and the owner is told nothing about it.
- savePurchaseSecret accepts an item UUID, a status from `planned|purchased|given|cancelled` and optional notes. The purchaser is the session user and is never read from the payload. The server rejects an item the caller owns before touching the secrets table, and returns one generic message whether the item was absent or forbidden, so probing yields no signal. `purchased_at` is derived by the database.
- deletePurchaseSecret accepts an item UUID and removes only the caller own row.
- loadWishlist issues two independent reads and joins nothing: items for the couple, and secrets for the caller. Secrets are keyed only for items the caller does not own, so no owner-facing shape can carry gift state. loadWishlistItem attaches a secret only when the caller is not the owner.

### Notes

- saveNote accepts an optional note UUID, a type from `shared|private`, title (1-160 trimmed) and body (1-20000 trimmed). Author and couple come from the session. An update by anyone other than the author matches no row. Switching type is an ordinary authored edit; the database trigger adds or withdraws the partner notification to match.
- deleteNote accepts a note UUID and succeeds only for the author.
- loadNotes reads the couple notes without filtering by type, leaving row level security as the single source of visibility, and reads the caller own read rows to mark unread shared notes. loadNote records read state for a note the caller did not author. Bodies are returned and rendered as plain text; nothing is parsed as markup.
