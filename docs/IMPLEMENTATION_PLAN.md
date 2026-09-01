# Implementation Plan

## Delivery method

Work in small, deployable phases. A phase is complete only after its behavior, security policies, negative tests, accessibility, documentation, migrations, lint, types, tests, and production build all pass. Never start a dependent phase on a knowingly broken foundation.

Before each phase, read [Agent Instructions](../AGENTS.md), query an existing Graphify graph, check current platform documentation, and confirm the relevant decisions in [Decisions](DECISIONS.md).

## Phase 0 — Documentation baseline

Status: **complete**.

Deliver this documentation set, check links and terminology, map the master prompt, and run Graphify for contradiction discovery. No application code or infrastructure.

Exit gate: all documented requirements are assigned to MVP, R2, Later, or an explicit open decision.

## Phase 1 — Foundation

Status: **implemented, pending local-database gate**. The application, authentication/profile contracts, PWA/theme shell, migration, pgTAP specification, responsive browser QA, lint, types, unit tests, and production build are complete. A clean database reset, live RLS execution, generated database types, and advisors remain blocked until a Docker-compatible local runtime is available.

- Create Next.js App Router project with strict TypeScript and pinned lockfile.
- Configure Tailwind, customized shadcn/ui foundation, lint, formatting policy, unit tests, browser tests, and build/typecheck scripts.
- Initialize Supabase local development, typed clients, environment validation, and migrations.
- Implement verified email/password auth, server session handling, profile foundation, protected routing, secure cookies, and recovery.
- Build responsive shell, theme, global states, and installable PWA shell.
- Use Impeccable to shape and visually verify the first surface, then generate `DESIGN.md` from the shipped system.

Exit gate: authentication and unauthenticated denial tests pass; clean database reset and production build pass.

Rollback: application deployment may roll back only while schema remains backward compatible; otherwise use a forward corrective migration.

## Phase 2 — Couple system and onboarding

Status: **in progress**. The normalized couple/membership/invitation migration, capacity trigger, hashed short-lived pairing-code functions, onboarding UI, avatar upload contract, and local developer preview are implemented. Hosted migration verification, two-account browser tests, rate limiting, revocation UI, and leave/delete behavior remain before the phase gate can close.

- Add couples, memberships, invitations, transactionally enforced two-member capacity, and RLS.
- Implement link/code creation, redemption, revocation, expiry, attempt limits, and rate limiting.
- Complete both onboarding paths and first-run state.
- Add cross-couple and concurrent third-member tests before UI completion is accepted.

Exit gate: every pairing negative scenario passes through database/API, not only UI.

## Phase 3 — Dashboard and milestones

- Add basic milestones, relationship counter, relevance selection, dashboard projections, quick actions, and empty states.
- Ensure projections cannot count or reveal private/secret content.
- Add first useful in-app notification records and preferences foundation.

Exit gate: dashboard tests cover empty, new, populated, and mixed-privacy couples in both timezones.

## Phase 4 — Bucket lists

- Add lists, items, categories, priorities, ordered subtasks, progress, filters, and completion.
- Implement accessible reordering and idempotent conversion foundation.
- Index couple/status/category/order access paths and review query plans.

Exit gate: CRUD, reorder, concurrency, cross-couple, and progress calculations pass.

## Phase 5 — Plans and internal calendar

- Add plans, types/statuses, checklist, reminders, location, budget, attachments, and bucket linkage.
- Build month, week, and upcoming views with mobile-specific behavior.
- Implement timezone/DST validation and due-reminder job architecture.

Exit gate: conversion, interval, timezone, reminder idempotency, and calendar browser tests pass.

## Phase 6 — Memories and media

- Add memories, tags, source relationships, private storage policies, media records, upload validation, derivatives, galleries, and viewers.
- Complete bucket/plan-to-memory continuity.
- Load-test bounded gallery queries and verify no public media paths.

Exit gate: signed URL, MIME/size, cross-couple storage, interrupted upload, and lazy-loading tests pass.

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
