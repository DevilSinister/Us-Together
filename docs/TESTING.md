# Testing Strategy

> Status update — 2026-09-05: the owner confirms manual testing of Phase 7, account creation, linking and sync. Keep current gallery changes; previous gallery follow-up is not an active task. Account lifecycle is on hold. Historical results below remain evidence for their date; outstanding implementation/automated checks are tracked in the [Release 2 backlog](release-2/BACKLOG.md) and [verification ledger](release-2/VERIFICATION.md), not claimed passed.

## Test layers

| Layer | Purpose |
| --- | --- |
| Unit | Pure validation, dates, money, visibility, conversion, and mapping logic |
| Database/RLS | Policies, constraints, functions, triggers, concurrency, and cross-tenant isolation |
| Service integration | Authenticated server actions, Storage, jobs, exports, and provider adapters |
| Component | Forms, states, keyboard behavior, and accessible names/errors |
| Browser E2E | Real signup/pairing/domain journeys in desktop and mobile viewports |
| Production build | Static/type boundaries, server/client separation, bundle and runtime compatibility |
| Security review | Abuse cases, upload handling, secrets/logging, headers, dependencies, and threat model |

Tests use isolated fictional users/couples and a resettable local/test Supabase instance. Tests must not depend on production services or real personal data.

## Mandatory commands

Phase 1 must establish:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:rls
npm run test:e2e
npm run build
```

Database verification includes clean migration replay on an empty disposable database, migration list/status, generated type drift checks, and current Supabase database/security advisors. ADR-014 adopts hosted verification without requiring Docker/Podman; clean replay and deferred real pairing remain explicitly open until performed. Exact CLI commands are discovered with `supabase --help` and documented when created.

## Authentication

- Signup, verification required, verification resend/expiry
- Correct/incorrect login, logout, session expiry, protected route
- Password reset request, single use, expiry, and session revocation behavior
- Account enumeration resistance and safe error messages
- Cookie/security configuration in production-like environment

## Pairing

- Link and code success
- Malformed, wrong, expired, revoked, exhausted, and already-used credential
- Rate-limit response without defensive-detail leakage
- Same user/repeated submit idempotency
- Existing membership conflict
- Two concurrent users attempt final slot; exactly one succeeds
- Third user cannot join a full couple through API/database
- Raw credential is absent from database/logs after issuance

## RLS and visibility matrix

Create User A/User B in Couple A, User C/User D in Couple B, an unpaired user, and unauthenticated role. For every table and supported operation, test permitted and denied SELECT/INSERT/UPDATE/DELETE. Attempt immutable owner/couple reassignment on UPDATE.

Mandatory negative cases:

1. User A requests Couple B record: zero rows/denied.
2. User B requests User A private note: zero rows/denied.
3. Wishlist owner requests partner purchase secret directly, by join/view/count/search/export/subscription: no disclosure.
4. Unauthenticated user requests private media: denied.
5. Couple A member requests Couple B media/path: denied.
6. Recipient queries surprise note before reveal and at/after trusted reveal time.
7. Former member repeats prior reads after leave/session refresh.
8. Client inserts/updates another owner or couple ID.
9. Notification/activity/dashboard projections do not infer hidden records.
10. Storage policies mirror metadata authorization for list/upload/read/update/delete.

## Domain behavior

Phase 3 adds deterministic unit coverage for empty and populated dashboards, viewer-timezone relationship day counts in `Asia/Karachi` and `America/Los_Angeles`, stable relevance ordering, and mixed shared/private/secret candidates. `0004_phase3_dashboard_rls.test.sql` specifies cross-couple milestone denial, recipient-only notification reads, immutable notification payloads, preference suppression, and former-member denial. The signed-in Playwright journey creates and features a milestone, marks the generic inbox row read, persists notification preferences, and checks mobile reduced-motion/overflow/focus behavior.

### Phase 4 executed evidence

See [Phase 4 verification](PHASE4_VERIFICATION.md) for the hosted 33-assertion suite, self-cleaning migration, indexed query plan, advisor findings and outstanding simultaneous-session checks. The bucket browser journey uses actual server actions through fictional development sessions, not hosted auth. It covers list/item CRUD, keyboard reorder, completion/progress, filters and conversion/deletion continuity on desktop and mobile.

### Bucket and plans

- CRUD, validation, filters, ordered subtasks, concurrent reorder, progress
- Complete once, retry safely, convert to plan without duplicate link
- Valid/invalid intervals, each plan type/status, cancel versus delete
- Month/week/upcoming boundaries, timezone conversion, DST gaps/overlaps
- Reminder scheduling, retry, idempotent delivery, cancellation

### Memories and media

- Create directly and from bucket/plan with provenance
- Allowed/denied MIME, extension mismatch, signature mismatch where inspected
- Size/dimension/duration limits and quota
- Cross-couple/object-path substitution and unfinalized upload cleanup
- Signed URL expiry, deletion, pagination, lazy video behavior
- Interrupted upload/draft recovery and accessible progress/error

### Wishlist and notes

- Owner CRUD and partner read-only wishlist behavior
- Purchaser-only create/update/delete, cannot purchase own item secretly
- Shared note access/read status and private author-only access
- Safe content rendering and attachment visibility
- R2 scheduling/reveal/open-when timing and duplicate job execution

## Browser journeys

- New user creates couple, partner joins, both reach first-run Home
- Add bucket item -> plan -> complete -> memory with media
- Add wishlist item -> partner privately marks purchased -> owner remains unaware
- Write shared and private notes and verify each account's visible state
- Export/leave/delete confirmation and safe post-action routing
- R2 vault lock/unlock/timeout/background and Calendar consent/share/disconnect

Run at representative narrow mobile and desktop widths, plus targeted tablet/calendar coverage. Use actual test sessions, not mocked client-only authorization.

Current automated evidence: `tests/e2e/paired-journey.spec.ts` verifies the deterministic connected-partner profile and the direct plan → complete → memory journey on desktop and mobile Chromium, plus mobile reduced-motion, keyboard focus, and horizontal-reflow checks. This fixture exercises real Server Actions but is a development-only session; the two-real-account Supabase browser journey remains a Phase 2 gate.

## Accessibility and design QA

- Automated accessibility scan plus keyboard/manual screen-reader smoke tests
- Focus order, dialogs/sheets, error association, live announcements, touch targets
- 200% zoom/reflow, contrast, non-color state cues, reduced motion
- Empty/loading/error/offline/permission states
- Impeccable desktop/mobile inspection and one detector pass after the UI is complete

## Performance

- Query plans for dashboard, membership/RLS predicates, calendar ranges, galleries, notifications, search
- Bounded query counts and payloads; no full-vault or full-video eager load
- Core Web Vitals budget set after the first representative implementation and measured in production-like builds
- Upload and media transformation limits; bundle analysis for heavy calendar/media dependencies

## Release checklist

- Clean checkout/install and environment validation
- Database reset from migrations and deterministic demo seed
- All required commands green with no ignored type/lint errors
- Advisors reviewed and high/critical findings resolved or explicitly blocked
- Required negative scenarios green
- Desktop/mobile/a11y smoke green
- No secrets, public private-media paths, or sensitive logs
- Documentation, ADRs, API/database specs, and traceability current
- Rollback/forward-fix compatibility and known limitations recorded
