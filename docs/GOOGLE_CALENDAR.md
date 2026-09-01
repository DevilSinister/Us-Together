# Google Calendar Integration

## Release and principle

Google Calendar is a voluntary per-user Release 2 integration. Connecting an account does not grant the partner access to the user's calendar. External events are represented as **Private external event** unless the owner explicitly shares selected details.

Current Google OAuth and Calendar documentation, verification requirements, scope names, token rules, and Supabase/Next.js patterns must be checked at implementation time.

## Consent and scopes

- Request the smallest scopes that satisfy selected behavior.
- Separate sign-in identity from Calendar consent; MVP does not use Google sign-in.
- Explain read/import and write/create permissions before redirect.
- Incremental consent is preferred if write capability is optional.
- Never request access to every calendar when a user can select one.

## OAuth flow

1. Authenticated user starts connection from Settings.
2. Server creates single-use state bound to user/session and an allow-listed return path; use PKCE/nonce where applicable.
3. Google consent returns to a server Route Handler.
4. Server validates state, exchanges the code, stores credentials server-side, and discards transient secrets.
5. User selects a calendar and import/create behavior.
6. Connected state shows account identity, selected calendar, permissions, last sync, and disconnect.

Tokens never reach normal client JavaScript or logs. Storage uses a secured server-only table/secret mechanism with encryption at rest appropriate to the platform. Access is connection-owner only.

## Privacy model

- Imported events belong to the connection owner, with an optional explicitly shared projection.
- Partner-safe default contains only a busy/private placeholder if the owner chooses to expose availability; otherwise it contains nothing.
- Event descriptions, attendees, conference links, locations, and titles remain private by default.
- App activity, notifications, search, and realtime follow the same owner/share state.
- Removing couple membership immediately removes partner access to shared projections.

## Synchronization

Documented implementation may support:

- User-triggered import of selected relevant events
- Creating an Us Together plan in the selected Google calendar
- Updating/deleting the linked Google event with explicit ownership rules
- Periodic incremental sync if current provider APIs and quotas justify it

Store provider event/calendar IDs only in owner-protected link records. Use sync tokens/version identifiers where supported, idempotency for event creation, and a deterministic conflict policy surfaced to the user. Do not silently overwrite edits when both systems changed.

## Token lifecycle and failure states

- Refresh server-side before authorized operations and serialize/coordinate refresh where concurrent requests could rotate credentials.
- `reauthorization_required`, `rate_limited`, `transient_failure`, `permission_changed`, and `disconnected` are distinct states.
- Provider downtime never blocks core plans/calendar use.
- Repeated permanent errors disable sync and prompt the owner; do not spam retries.
- Disconnect deletes local credentials and attempts provider revocation where supported, while preserving user-created Us Together plans.

## Data minimization and retention

Persist only fields needed for the selected behavior. Avoid copying full private event bodies. Define cleanup for disconnected accounts, deleted events, expired sync state, account deletion, and logs. Export includes only data the requesting user owns or may access, never the partner's private imported events.

## Required tests

- OAuth state replay, wrong user/session, invalid redirect, denied consent, expired code
- Scope minimization and token non-exposure
- Owner-only connection/event access and cross-couple denial
- Private-by-default partner view and explicit share/revoke
- Refresh rotation/concurrency, revoked credentials, rate limit, provider outage
- Idempotent event creation and conflict handling
- Disconnect/revocation and account/couple deletion cleanup
