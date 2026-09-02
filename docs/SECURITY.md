# Security Specification

## Security objectives

1. A user cannot access another couple's records or media.
2. A partner cannot access author-private content.
3. A wishlist owner cannot detect purchaser-only state.
4. Surprise content cannot be discovered before reveal.
5. Vault media cannot be obtained without membership and a current authorized unlock session.
6. Credentials and private content do not leak to unauthorized clients or through logs, analytics, notifications, search, or shared realtime. Authorized memory uploaders receive a transient allocated path for TUS; authorized viewers receive a short-lived signed read URL. Neither is persisted by the application or included in gallery DTOs.

## Threat model

Relevant actors include unauthenticated attackers, authenticated users probing other tenants, a current partner probing private features, a former partner using stale sessions/URLs, credential guessers, malicious uploaders, compromised third-party integrations, and accidental operator exposure.

The system does not claim protection from a fully compromised user device, an authorized partner copying shared content, or true end-to-end confidentiality from the service operator. The MVP/R2 vault is protected access, not zero-knowledge encryption.

## Trust boundaries

- Browser input is untrusted, including IDs, ownership, roles, paths, MIME, redirect URLs, and timestamps.
- Next.js server code authenticates, validates, authorizes, and minimizes output.
- PostgreSQL RLS and Storage policies are the final tenant/row/object isolation layer.
- Service-role credentials are server-only and exceptional; using them creates an explicit bypass boundary.
- Google and future providers receive only approved scopes/data and are treated as external systems.

## Authentication and sessions

- MVP uses verified email/password with recovery; passwords are handled by Supabase Auth and never stored by application tables.
- Use secure, HTTP-only, same-site cookies according to current Supabase SSR guidance.
- Sensitive account, couple, export, and vault settings may require recent authentication.
- Account deletion/sign-out revokes sessions where supported; short token lifetime and session validation are considered for sensitive operations because deleting a user alone does not invalidate all issued tokens.
- Authorization never uses user-editable metadata claims.

## Authorization and RLS

- Enable RLS on every exposed table before granting Data API access.
- Couple access requires an active membership predicate tied to the row's `couple_id`.
- User-private access requires `auth.uid()` to equal the immutable owner/author.
- Purchase-secret access requires the purchaser and rejects the wishlist owner.
- UPDATE policies include `USING` and `WITH CHECK`, with a compatible SELECT policy.
- Views use security-invoker semantics or remain unexposed.
- Security-definer functions are rare, private-schema, safe-search-path, execute-revoked, identity-checking, and directly tested.
- Server checks supplement RLS for workflow, reveal, vault, and rate-limit rules.

## Pairing security

- Link tokens contain at least 128 bits of cryptographic randomness.
- Six-digit codes use a cryptographically secure generator and compensate for low entropy with short expiry, low attempt budget, per-account/credential/network rate limits, and one-time use.
- Store a keyed or slow/appropriate digest, never plaintext. Exact construction must be reviewed for the threat model.
- Acceptance is a transaction that locks invite/couple state, validates active capacity, consumes once, and prevents replay.
- Responses do not reveal whether unrelated couples or users exist.

## Secret and private content

Privacy applies to rows, aggregates, joins, counts, search, activity, notification generation, realtime channels, exports, caches, analytics, and logs. UI hiding is irrelevant if any alternate channel leaks existence.

Pre-reveal surprise eligibility should be evaluated in the database/server with trusted time. Client clock is not authoritative. Scheduled workers must be idempotent and avoid content in queue metadata.

## Storage and uploads

- All memory and vault buckets are private. Public URLs and permanent signed URLs are forbidden.
- Authorization verifies current user, couple, feature, metadata row, and server-constructed path.
- Allow-list MIME and extension together; inspect actual file signatures where practical.
- Phase 6 memory media accepts JPEG/PNG and MP4/WebM within documented limits. Other formats remain future candidates, not an enabled upload promise.
- Reject HTML, SVG, scripts, executables, polyglots where detectable, and unsupported archives.
- Enforce configurable size, dimension, duration, and quota limits before/finalization.
- Serve downloads with safe content types/disposition and avoid reflecting user filenames into headers unsafely.
- Storage upsert permissions require the complete intended INSERT/SELECT/UPDATE policy set or, preferably, immutable object versions.

## Web and application security

- Zod validation at every server boundary and contextual output encoding/sanitization.
- Safe rich-text format; arbitrary HTML is not accepted.
- Same-origin checks/CSRF protection for cookie-authenticated mutations.
- Strict redirect allow-list and OAuth state/PKCE/nonce as applicable.
- Content Security Policy, secure headers, frame restrictions, referrer policy, and dependency integrity configured during foundation.
- Rate limits for auth-adjacent, pairing, upload, export, signed URL, and expensive search endpoints.
- Correlation IDs are opaque and contain no tenant/content data.

## Logging and audit

Log security-relevant metadata for pairing, disconnect, vault access, password/account changes, export, and administrative actions. Redact query/body fields by default.

Never log passwords, verification/recovery credentials, OAuth tokens, service keys, vault PINs/derived secrets, signed media URLs, private note content, surprise content, secret purchase state, or raw exports.

## Mandatory negative scenarios

1. User A in Couple A requests Couple B record: denied.
2. User B requests User A private note: denied without existence leak.
3. Wishlist owner queries purchaser-only state: no record, field, count, event, or timing-dependent disclosure.
4. Unauthenticated user requests memory/vault media: denied.
5. Authenticated member requests another couple's media: denied.
6. Expired/exhausted/consumed pairing code: denied.
7. Concurrent third user attempts to join a full couple: denied transactionally.
8. Former member reuses a signed URL or stale session: denied where the request reaches authorization; URLs remain short-lived.
9. Recipient searches/subscribes before a surprise reveal: no result/event.
10. Client changes owner/couple/storage path fields: rejected by validation, service, and policy.

See [Testing](TESTING.md) for execution layers.

## Secrets and environment

Use platform secret stores and a committed `.env.example` containing names only. Browser variables are public by definition. Prefer current Supabase publishable keys for clients; legacy anon keys are compatibility-only. Secret/service-role keys, Google client secrets, webhook secrets, and encryption material are never prefixed `NEXT_PUBLIC_`.

## Incident response

Classify and contain; revoke credentials/sessions; disable affected integration/feature; preserve safe audit evidence; assess affected tenants/records; patch forward; verify negative tests; notify according to future legal/policy requirements; document the incident without sensitive content. See [Operations](OPERATIONS.md).

## Shared-entry extension

Moment uploads use the same authenticated parent checks, binary validation, bounded processing, signed-read lifetime and cleanup ordering as memory uploads, with separate private table/bucket ownership. Caption mutations cannot change media identity. Comments are shared only through active parent membership; deletion is author-only. Reminders are personal even within a couple and the worker rechecks membership and notification preferences before emitting generic content.

Preview files/comments are local IndexedDB records keyed by developer session and parent; they are not shared or uploaded. Preview entry-reminder polling has been removed. Per-file comments are scoped by session, parent and media ID; no preview comments are shared across users. Location lookup is an intentional external request using only user-entered search text or explicitly permitted geolocation; no story, caption, comment, ownership identifier or account credential is forwarded. Returned coordinates are not persisted. Production request logging must not record provider query strings.
