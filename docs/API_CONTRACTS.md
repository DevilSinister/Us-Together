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

## Bucket and plan actions

- `createBucketItem`, `updateBucketItem`, `deleteBucketItem`
- `reorderBucketSubtasks` with item version/precondition to prevent lost updates
- `completeBucketItem` with idempotency key
- `createPlan`, `updatePlan`, `cancelPlan`, `deletePlan`
- `createPlanFromBucketItem` returning the existing link on safe retry
- `completePlan`

Inputs accept public record IDs only as lookup keys. The server loads the row under RLS and checks couple membership. Date inputs include ISO instants and IANA timezone when local interpretation matters. Money input is validated as currency plus minor units/fixed precision.

## Memory and media contracts

- `createMemory`, `updateMemory`, `deleteMemory`
- `createMemoryFromSource` with bucket/plan provenance and idempotency
- `requestMediaUpload` validates feature, owner, MIME, extension, size, and intended path before returning constrained upload authorization
- `finalizeMediaUpload` verifies stored object metadata before creating/publishing a media row
- `deleteMedia` authorizes metadata and object together
- `getMemoryMediaUrl` returns a short-lived signed URL after authorization

Client-supplied storage paths are never used directly. Upload/finalize has an expiry and cannot attach an object from another couple or feature.

## Wishlist and note actions

- `createWishlistItem`, `updateWishlistItem`, `deleteWishlistItem`
- `markWishlistPurchased`, `updatePurchaseSecret`, `clearPurchaseSecret`
- `createNote`, `updateNote`, `deleteNote`, `markNoteRead`
- R2: `scheduleNote`, `cancelScheduledNote`, `openOpenWhenNote`

Purchase-secret results are returned only to the purchaser and never embedded in wishlist-owner DTOs. Note DTO selection is type-specific; pre-reveal surprise records do not appear to recipients.

## Notifications and dashboard reads

Dashboard data is composed server-side from individually authorized queries or security-invoker projections. It returns only display-ready safe summaries. Notification references are dereferenced only if the recipient can still access the target; otherwise the notification is removed or shown without leaking content.

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
