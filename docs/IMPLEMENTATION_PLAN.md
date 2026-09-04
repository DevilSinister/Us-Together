# Implementation Plan

## Delivery method

Current workflow (ADR-014, 2026-09-02): use hosted Supabase without Docker/Podman; real two-account pairing is deferred to final integration by user direction. Earlier phase status paragraphs retain historical evidence and do not require installing a local runtime. Clean migration replay and genuinely concurrent-session checks remain open release obligations, not silently passed tests.

Work in small, deployable phases. A phase is complete only after its behavior, security policies, negative tests, accessibility, documentation, migrations, lint, types, tests, and production build all pass. Never start a dependent phase on a knowingly broken foundation.

Before each phase, read [Agent Instructions](../AGENTS.md), query an existing Graphify graph, check current platform documentation, and confirm the relevant decisions in [Decisions](DECISIONS.md).

## Phase 0 — Documentation baseline

Status: **complete**.

Deliver this documentation set, check links and terminology, map the master prompt, and run Graphify for contradiction discovery. No application code or infrastructure.

Exit gate: all documented requirements are assigned to MVP, R2, Later, or an explicit open decision.

## Phase 1 — Foundation

Status: **implemented, hosted migration applied; local-database gate pending**. The application, authentication/profile contracts, PWA/theme shell, migrations, generated hosted database types, responsive Playwright QA, lint, unit tests, and production build are complete. Foundation, onboarding, Plans/Memories, and pairing-hardening migrations are applied to the verified managed Us-Together project. A clean local reset and pgTAP execution remain pending because Docker/Podman is unavailable. The in-app browser runtime also fails during Windows sandbox startup; Playwright desktop/mobile coverage and a clean rendered Impeccable detector pass provide the current UI evidence.

- Create Next.js App Router project with strict TypeScript and pinned lockfile.
- Configure Tailwind, customized shadcn/ui foundation, lint, formatting policy, unit tests, browser tests, and build/typecheck scripts.
- Initialize Supabase local development, typed clients, environment validation, and migrations.
- Implement verified email/password auth, server session handling, profile foundation, protected routing, secure cookies, and recovery.
- Build responsive shell, theme, global states, and installable PWA shell.
- Use Impeccable to shape and visually verify the first surface, then generate `DESIGN.md` from the shipped system.

Exit gate: authentication and unauthenticated denial tests pass; clean database reset and production build pass.

Rollback: application deployment may roll back only while schema remains backward compatible; otherwise use a forward corrective migration.

## Phase 2 — Couple system and onboarding

Status: **in progress; lifecycle implementation complete, local/concurrency gates pending**. The normalized couple/membership/invitation model, capacity trigger, hashed short-lived pairing codes, account/credential attempt limits, invite cooldown/revocation, leave behavior, empty-couple deletion, partner-aware UI, deterministic Alex + Maya fixture, and hosted advisor verification are implemented. The remaining phase blockers are a clean local migration reset/pgTAP run, a concurrent-final-slot test, and a real two-Supabase-account browser journey (the current browser journey uses the server-only developer fixture).

- Add couples, memberships, invitations, transactionally enforced two-member capacity, and RLS.
- Implement link/code creation, redemption, revocation, expiry, attempt limits, and rate limiting.
- Complete both onboarding paths and first-run state.
- Add cross-couple and concurrent third-member tests before UI completion is accepted.

Exit gate: every pairing negative scenario passes through database/API, not only UI.

## Phase 3 — Dashboard and milestones

Status: **implemented, hosted migrations applied; local-database gate pending**. The relationship counter uses viewer-timezone calendar dates; Home composes bounded, membership-authorized plan, memory, milestone, bucket-progress, and generic-notification reads. Basic milestone create/list/feature flows, real quick actions, empty/unpaired states, a recipient-owned notification inbox, and user-owned category preferences are shipped. Unit tests cover empty, populated, stable relevance, both timezone edges, and mixed shared/private/secret candidates; Playwright covers the paired desktop/mobile journey and reduced motion. The hosted schema and advisors were verified. Local reset and pgTAP execution remain pending because Docker/Podman is unavailable, while hosted pgTAP requires a Supabase CLI access token not available to this session.

- Add basic milestones, relationship counter, relevance selection, dashboard projections, quick actions, and empty states.
- Ensure projections cannot count or reveal private/secret content.
- Add first useful in-app notification records and preferences foundation.

Exit gate: dashboard tests cover empty, new, populated, and mixed-privacy couples in both timezones.

## Phase 4 — Bucket lists

Status: **implemented; hosted negative suite passed, final integration gates open**. Lists/items/steps CRUD, category/priority/status filters, progress, accessible reorder and retry-safe plan/memory conversion are implemented. Hosted migrations, generated types, advisors and indexed query plans are verified; 33 pgTAP assertions pass. Docker/Podman is not required (ADR-014). Clean-from-zero replay, true overlapping-session timing and real-account pairing are not claimed. See [Phase 4 verification](PHASE4_VERIFICATION.md).

- Add lists, items, categories, priorities, ordered subtasks, progress, filters, and completion.
- Implement accessible reordering and idempotent conversion foundation.
- Index couple/status/category/order access paths and review query plans.

Exit gate: CRUD, reorder, concurrency, cross-couple, and progress calculations pass.

## Phase 5 — Plans and internal calendar

Status: **implemented; hosted security suite passed, final integration gates open**. Full plan details/CRUD, cancellation/restoration, checklist/reorder, month/week/upcoming views, timezone/DST handling, location/map/budget fields, private attachments, in-app reminder delivery and bounded retries are implemented. Hosted migrations, scheduler execution, generated types, and 40 pgTAP assertions are verified; desktop/mobile regression passes. ADR-014 final integration and the real-account attachment round trip remain explicit obligations. See [Phase 5 verification](PHASE5_VERIFICATION.md).

- Add plans, types/statuses, checklist, reminders, location, budget, attachments, and bucket linkage.
- Build month, week, and upcoming views with mobile-specific behavior.
- Implement timezone/DST validation and due-reminder job architecture.

Exit gate: conversion, interval, timezone, reminder idempotency, and calendar browser tests pass.

## Phase 6 — Memories and media

Status: **implemented; functional gates passed; fixture cleanup awaits explicit approval**. Memory detail/edit/delete, normalized tags, location labels without manual coordinate fields, rating/favorite, bounded gallery filters, preserved provenance, private JPEG/PNG/MP4/WebM upload, derivatives, signed viewers, recovery and cleanup are implemented. Verification includes 42 RLS assertions, 34 real hosted binary checks, and desktop/mobile authenticated media journeys. Automatic approval review blocked deletion of the three generated fixture accounts and their two couples; the guarded cleanup migration is prepared but unapplied. ADR-014 replay/concurrent-session/final-pairing obligations remain explicit. See [Phase 6 verification](PHASE6_VERIFICATION.md).

- Add memories, tags, source relationships, private storage policies, media records, upload validation, derivatives, galleries, and viewers.
- Complete bucket/plan-to-memory continuity.
- Load-test bounded gallery queries and verify no public media paths.

Exit gate: signed URL, MIME/size, cross-couple storage, interrupted upload, and lazy-loading tests pass.

### Current UI follow-up — 2026-09-04

The user confirms live list creation, partner verification and partner syncing work. This is user-reported production evidence; clean migration replay, concurrent-session tests and attachment-specific integration checks remain separate obligations. The next requested work is mobile navigation and a list-first bucket flow, before Phase 7. See [UI follow-up](MOBILE_LISTS_VERIFICATION.md).

## Phase 7 — Wishlists and notes

- Add user-owned wishlist items with partner visibility and purchaser-only purchase-secret records.
- Add shared and author-private notes with sanitized rendering and attachments as supported.
- Audit notifications, activity, search-ready projections, and realtime for inference leaks.

Exit gate: wishlist owner cannot detect purchase secrets; partner cannot detect private notes through any supported channel.

## Phase 8 — MVP completion

- Complete settings, notification preferences, exports, leave/disconnect, account/couple deletion, audit events, and operations hooks.
- Perform accessibility, responsive, performance, security, RLS, copy, empty/error/loading, and dependency reviews.
- Run full migration reset, seed, build, and production-like smoke test.
- Update Graphify and close material contradictions.

Exit gate: all MVP acceptance criteria and the release checklist in [Testing](TESTING.md) pass.

## Release 2 phases

1. Advanced notes, Know Me, and Our Story
2. Vault implementation followed by a dedicated threat-model and security review
3. Google Calendar OAuth and privacy-aware synchronization
4. Push, richer realtime, global search, and expanded export

Each is independently releasable behind a server-controlled feature flag or disabled route. Vault and Calendar must not be enabled until their dedicated negative suites pass.

## Later phases

Rule-based date suggestions, couple questions, advanced trip planning, and AI are separate projects with new product/privacy decisions. AI work must use the OpenAI documentation skill if OpenAI is selected and must define consent, minimization, retention, evaluation, and provider-failure behavior before sending relationship data.

## Required phase evidence

Every completion report includes:

- Implemented and deliberately deferred behavior
- Migration names and reset/list verification
- Test commands/results, including negative authorization cases
- Database/security advisor findings and resolution
- Desktop/mobile/accessibility verification artifacts
- Environment/configuration changes without secret values
- Documentation/decision/traceability changes
- Known limitations and rollback compatibility

## Skill matrix

- Product/UI phases: Impeccable before UI decisions and after visual implementation.
- Database/Auth/Storage phases: Supabase plus Postgres Best Practices and current official docs.
- Cross-system review: Graphify query/update.
- Browser acceptance: in-app browser control with signed-in test accounts.
- Raster assets: Imagegen only after the visual direction proves the need.
- Future OpenAI work: OpenAI Docs before selecting models, APIs, retention, or SDK patterns.

### Phase 6 user-requested extension

Implemented: shared Calendar via Home/navigation, memory/moment multi-photo creation and detail upload, captions/comments, browser-local preview files and free Photon/OpenStreetMap search. The gallery follow-up removes memory/moment reminders, adds six-photo previews, a Home gallery and per-file partner comments. See PHASE6_GALLERY_VERIFICATION.md for current gates. Earlier fixture-account cleanup and ADR-014 final-integration obligations remain open; the extension does not waive them.
