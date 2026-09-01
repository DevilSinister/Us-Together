# Architecture

## Purpose

This document defines the intended architecture for Us Together. It is a pre-implementation contract; package versions and platform-specific APIs must be verified against current official documentation when implementation begins.

## System context

```text
Browser / installed PWA
        |
        | HTTPS, secure cookies
        v
Next.js on Vercel
  - Server Components
  - Server Actions
  - Route Handlers
  - authorization/services
        |
        +--------> Google OAuth / Calendar (Release 2)
        |
        v
Supabase
  - Auth
  - PostgreSQL + RLS
  - private Storage + policies
  - Realtime (selective)
  - scheduled/edge capabilities where justified
```

## Tenancy and ownership

The core path is `auth user -> couple_members -> couples -> couple-owned data`.

- A user may be modeled to support more than one historical membership, but the initial UX presents one active couple.
- A couple accepts at most two active memberships. Acceptance must check and lock capacity transactionally.
- Every couple-owned entity has a non-null `couple_id` and foreign key.
- User-private records also contain the author/owner user ID.
- Purchaser-only and pre-reveal secrets use separate tables or protected rows; shared parent rows never include secret state.
- RLS is enabled on every table exposed through the Data API. Server authorization is defense in depth, not a substitute.

## Application boundaries

### Presentation

App Router route groups separate authentication, onboarding, and the authenticated application. Server Components are preferred for initial data reads. Client Components are used only for interaction, browser APIs, realtime subscriptions, rich forms, and upload progress.

### Domain services

Business rules live in server-only services grouped by domain: identity, couples, bucket lists, plans, memories, wishlists, notes, notifications, media, vault, and calendar. Services accept authenticated context derived on the server rather than caller-supplied ownership.

### Mutation boundary

Server Actions are the default for first-party form mutations. Route Handlers are used for OAuth callbacks, webhooks, signed media endpoints, exports, and endpoints that need explicit HTTP semantics. All input is parsed with Zod before domain code executes.

### Data access

Normal user operations use an authenticated Supabase client so RLS remains active. A service-role or other elevated client is restricted to narrowly scoped server-only administration and scheduled processing. Elevated operations must independently authenticate, authorize, validate inputs, and avoid returning unrestricted rows.

## Key data flows

### Pairing

1. Authenticated user creates a couple and invite.
2. The server creates a random link token or six-digit code, stores only a secure digest, expiry, attempt budget, and creator/couple references.
3. Recipient authenticates before acceptance.
4. A transaction validates digest, expiry, attempts, unused state, existing membership, and couple capacity.
5. Acceptance creates membership and atomically consumes the invitation.

### Dream to memory

1. A bucket item is created inside the active couple.
2. “Plan this” creates a plan and a durable source relationship; values are copied only when they describe a plan snapshot.
3. Completion records actor/time and offers memory creation.
4. The memory retains provenance to the bucket item and optionally the plan.
5. Timeline projections can later include the completed item, plan, memory, and milestone without duplicating private content.

### Media

1. Server authorizes the actor and issues a constrained upload path or upload authorization.
2. Client uploads only an allow-listed MIME/size class to a private bucket.
3. Metadata is validated and recorded separately from the binary.
4. Reads use authorized short-lived signed URLs; permanent public URLs are forbidden.
5. Galleries paginate metadata and lazy-load media.

### Secret content

Visibility is derived from record type, authenticated user, ownership, recipient, and reveal time. Before reveal, surprise content must not leak through counts, notifications, activity, search, realtime, logs, or parent projections.

## Background work

Scheduled note delivery, reminders, notification fan-out, token refresh, media derivative processing, exports, and cleanup are idempotent jobs. The implementation must choose a currently supported Supabase/Vercel scheduling mechanism after checking platform limits. Jobs store attempt state and use deterministic keys to avoid duplicate user-visible effects.

## Realtime and caching

- Realtime is selective: shared notes, shared memories, and plan changes are candidates.
- Private, surprise, secret-purchase, and vault content is excluded from shared channels.
- Authorization-sensitive responses are never placed in a public/shared cache.
- Server-rendered personalized pages use per-user/couple cache isolation or no shared caching.
- Database queries are paginated and indexed by ownership plus common ordering/filter columns.

## Integrations

Google Calendar is Release 2 and has its own privacy boundary. OAuth credentials stay server-side and calendar events are private external events unless the account owner explicitly shares selected details. See [Google Calendar](docs/GOOGLE_CALENDAR.md).

Future AI is provider-neutral behind a service interface. No AI provider receives private relationship or vault content without a future explicit consent and data-governance decision.

## Deployment topology

Use separate local, preview/staging, and production Supabase projects or equivalent isolated environments. Vercel preview deployments must never default to production data. Database migrations move forward through reviewed, repeatable files before compatible application code is promoted.

See [Database](docs/DATABASE.md), [API Contracts](docs/API_CONTRACTS.md), [Security](docs/SECURITY.md), and [Deployment](docs/DEPLOYMENT.md).
