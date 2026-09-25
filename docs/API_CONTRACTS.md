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

Phase 4 list/item/step actions return { ok, message, id? }. filterBucketItems validates list/status/priority/category/cursor and returns { page?, error? }, with 12 rows and a next UUID cursor. Filters stay in the request body. List/item deletion requires literal DELETE; lists must be empty. Since 2026-09-25 the interface sends that literal from its confirmation dialog rather than a typed field (ADR-038). Conversion forms prefill content but commit only on submit; a plan made from an idea uses the ordinary plan form with a hidden `sourceBucketId` (ADR-039). Completed-idea memory creation calls create_memory_from_bucket; both conversion RPCs are security invokers and retry on source identity. No supplied actor/couple field is accepted.

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

## Project-wide location rule — 2026-09-05

Use OpenStreetMap-based APIs/services wherever location functionality is mentioned. Reuse existing Photon lookup and follow the [location policy](release-2/LOCATION_POLICY.md). Google Calendar integration does not select a geocoding provider. This documentation update adds no API, schema or runtime behavior.

### Drawing notes extension — 2026-09-16

- `POST /api/drawing-notes` accepts same-origin multipart `image`, a PNG no larger than 2 MB whose decoded size is exactly 640×480. It derives author, couple and active recipient from the server session, re-encodes the bitmap, uploads it to private Storage, then publishes an immutable row. Success returns `201 { id }`; failure returns a generic error and does not publish a partial note.
- `GET /api/drawing-notes/{id}/image` validates a UUID and returns a ready image only when the cookie session may read its row and Storage object. It uses private no-store and nosniff headers. The Android client instead uses its own Supabase session against the RLS-protected row and Storage APIs.
- The Android client registers/deletes only its own `drawing_devices` token through RLS. Its widget opens the cached drawing natively; notification taps open the app at the target path.

### Note it polish — 2026-09-20

- `GET /drawings?after=<cursor>` and `GET /notes?after=<cursor>` page 25 rows by keyset (`sent_at`/`updated_at` desc, `id` desc). The cursor is base64url `time|id` from `src/lib/pagination/cursor.ts`; a malformed cursor yields the first page, never a filter fragment.
- `GET /drawings/{id}?sent=1` shows a one-time "Sent to {partner}" status; the parameter has no server effect.
- Opening a received drawing inserts `drawing_reads(drawing_id, user_id)` with `ON CONFLICT DO NOTHING`; opening a received shared note does the same on `note_reads`. Neither table grants UPDATE, so both writes are insert-only by design.
- The former `GET /api/drawing-notes/push-status` route and the web-route FCM call are removed. Android delivery is database-driven: `notifications_enqueue_fcm` fans out to `fcm_deliveries`; `private.dispatch_due_fcm(50)` posts `{deliveries:[{deliveryId, token, notificationId, title, category, targetType, targetId}]}` to the `fcm-dispatch` Edge Function with `x-dispatch-secret`; the function sends a data-only FCM v1 message `{type, category, title, targetType, targetId, targetPath, notificationId, deliveryId, tag}` (all strings, no content; `android.priority` HIGH for `drawing`) and calls `settle_fcm_deliveries({results:[{deliveryId, outcome: delivered|gone|failed}]})`, which is executable by `service_role` only.
- `GET /.well-known/assetlinks.json` is a static file served outside the session proxy; it names package `app.ustogether` and the release signing fingerprints for Trusted Web Activity verification.
## Partner updates — 2026-09-17

Recipient-owned `notifications` rows are the cross-client event source. Android reads at most 30 recent rows through authenticated PostgREST, retains a per-account generic-envelope cache for offline viewing, and calls `mark_notification_read(notification_id)` through authenticated POST. The function updates only the current recipient's unread row under RLS and returns whether a row changed. Web inbox and push clicks resolve bucket list, bucket idea, wishlist and drawing targets. User-authored content remains absent from envelopes and push payloads.

## Privacy lock RPCs — 2026-09-17

Authenticated `app_lock_status()` returns `{configured,areas}`. `app_lock_open(area)` returns access for the current JWT session. `app_lock_configure(code,areas)` sets the initial code or verifies the existing code before replacing the selected area list; `app_lock_verify(code)` checks setup eligibility; `app_lock_unlock(code,area)` creates a five-minute server unlock; `app_lock_lock(area)` revokes it. The public functions use security-invoker wrappers and never accept a user or session ID from the client. Invalid or blocked code returns false. Server Actions in `src/app/actions/privacy.ts` validate all inputs with Zod and require an authenticated user. The browser device unlock decrypts a locally wrapped code, then calls the same server unlock path.

### PIN flow update

`app_lock_status()` also returns `pin_length` (4, 6 or null for a legacy code). New setup accepts a 4- or 6-digit PIN. Existing codes of 6–12 digits remain valid for unlock and configuration until changed. Authenticated `app_lock_change_code(current_code,new_code)` verifies the current code and accepts only a new 4- or 6-digit PIN; success revokes all current unlocks. The server action `changePrivacyPin` validates both inputs. Setup and change screens require local confirmation before making the mutation.

## `GET /api/avatar/[scope]`

`scope` is the closed set `me` | `partner`; anything else is 404. There is no identifier in the URL and the route never accepts a caller-supplied storage path — both branches derive the object from the session, so each is an own-folder read under the existing `avatars` policies and no cross-account read is possible.

- `me` serves `profiles.avatar_path` for the signed-in user.
- `partner` serves `partner_presentations.avatar_path` for `owner_id = auth.uid()` — the picture that account chose for its partner, never the partner's own.

Every failure answers `404`: no session, a developer/preview identity, no row, a null path, an unrecognised extension, or an unreadable object. The route therefore cannot distinguish "nothing here" from "not allowed".

Responses stream the bytes — no redirect to a signed URL, unlike `/api/memory-media/[id]`, because an avatar repeats many times on one page — with `Content-Type` derived from the stored path rather than the blob's own claim, `Cache-Control: private, max-age=300, must-revalidate`, an `ETag` over the path, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` and `Referrer-Policy: no-referrer`. `If-None-Match` answers `304`. The cache header is a deliberate departure from the `no-store` used by the other private-media routes: an avatar is chrome the requesting account uploaded itself, `private` keeps it out of shared caches, and every upload mints a fresh UUID path so the ETag changes the instant the picture does.

## `GET /api/version` — 2026-09-25

Public and unauthenticated. Answers `200 { "version": "<commit sha>" }` with `Cache-Control: no-store`. The value is `VERCEL_GIT_COMMIT_SHA` inlined by `next.config.ts` at build time as `NEXT_PUBLIC_APP_VERSION`, so it is the same string every client bundle of that deployment already carries; it discloses nothing new. Outside Vercel the value is `""` and every open tab treats updates as off. The proxy matcher excludes the path, so polling never refreshes a Supabase session. The client validates the body with Zod (`parseServedVersion` in `src/lib/app-version.ts`) and prompts only when both sides are non-empty and differ.

## Android update manifest — 2026-09-25

Not a server route: `.github/workflows/android-release.yml` attaches `update.json` and `us-together.apk` to a GitHub release, and installed APKs read `https://github.com/<repo>/releases/latest/download/update.json` (baked in as `WIDGET_UPDATE_MANIFEST_URL`).

```json
{ "versionCode": 123, "versionName": "0.3.23", "apkUrl": "https://github.com/<repo>/releases/download/android-v123/us-together.apk", "sha256": "<64 lowercase hex>" }
```

`ReleaseInfo.of` rejects a manifest unless `versionCode > 0`, `versionName` is 1–40 characters, `sha256` is 64 hex digits, and `apkUrl` is https on the manifest's own host with no credentials. The download is capped at 100 MB and refused on a digest mismatch; Android refuses any APK not signed with the installed app's key.
