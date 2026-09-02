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

Implemented now: `createPlanAction` derives a couple with exactly two active partners from the authenticated session, validates form data with Zod, resolves local date/time through the supplied IANA timezone, rejects DST gaps and invalid intervals, converts money to integer minor units, and creates only an RLS-visible row. `completePlanAction` reloads the public plan ID under RLS before recording the authenticated actor and completion instant. With `sourceBucketId`, `createPlanAction` instead calls the RLS-protected, source-locking `create_plan_from_bucket` RPC and returns the existing linked plan on retry. Any active membership can operate on retained shared ideas, including the continuing member after leave. Full plan update/cancel/delete remains planned.

## Memory and media contracts

- `createMemory`, `updateMemory`, `deleteMemory`
- `createMemoryFromSource` with bucket/plan provenance and idempotency
- `requestMediaUpload` validates feature, owner, MIME, extension, size, and intended path before returning constrained upload authorization
- `finalizeMediaUpload` verifies stored object metadata before creating/publishing a media row
- `deleteMedia` authorizes metadata and object together
- `getMemoryMediaUrl` returns a short-lived signed URL after authorization

Client-supplied storage paths are never used directly. Upload/finalize has an expiry and cannot attach an object from another couple or feature.

Implemented now: `createMemoryAction` supports direct creation and completed-plan provenance. The server reloads a source plan under RLS, requires completion, derives its couple, and returns the existing memory on a safe retry. The metadata schema and private Storage policy are present; upload authorization/finalization and signed URL actions remain deliberately unavailable in the UI until their verification suite exists.

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
