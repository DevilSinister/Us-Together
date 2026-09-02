# Phase 4 verification — 2026-09-02

## Delivered

Shared bucket list create/rename/empty-delete; idea create/read/edit/delete; categories, four priorities and statuses, target date, location and estimated cost; ordered editable steps, completion and progress; bounded filters and pagination; idempotent idea-to-plan and completed-idea-to-memory conversion; source links in Plans/Memories; exact shared Home counts. Actor and couple come from authenticated server context and RLS, never client ownership fields.

## Hosted database evidence

- Confirmed the explicitly supplied project is Us-Together; reference saved only in ignored local configuration.
- Applied `phase4_bucket_lists` (local `20260902013104`, hosted `20260902015221`).
- Applied `phase4_verification` (local `20260902015719`, hosted `20260902015844`). The connector assigns hosted timestamps; migration names and source SQL are the correspondence, not timestamp equality. Do not blindly push duplicate local versions to the already-migrated hosted project.
- Migration listing confirms all eight expected migrations through Phase 4. Generated hosted bucket row/function types were refreshed. PostgreSQL RPC argument nullability requires narrow documented type assertions at the validated conversion boundary.
- All **33 pgTAP assertions** in `supabase/tests/database/0005_bucket_lists_rls.test.sql` passed: own/foreign/former-member visibility, immutable tenancy/creator, stale reorder, exact permutation, step progress, nonempty-list protection, retry-safe conversion, completion actor and preserved downstream records after deletion.
- The connector SQL endpoint is read-only. The verification migration executes the suite in a nested rollback subtransaction, raises on any failed assertion, and deliberately rolls back successful fixture work too. Follow-up counts confirmed zero retained fixture users, lists or items. No real personal records were read or changed by the suite. Do not run destructive fixture/reset tests against populated production.
- `EXPLAIN` for couple/category/cursor with status filter selects `bucket_items_category_idx`; the status remains a filter. This validates an available indexed access path, not production-scale latency or RLS session timing.
- Security advisor: no new Phase 4 finding. Existing invitation-table no-policy notice is intentional RPC-only access. Leaked-password protection remains disabled and is a prelaunch configuration task: [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Performance advisor reports informational unused indexes on the low-volume schema. Retain access-path indexes until real query statistics justify changes.

## Application and visual gates

The bucket browser journey uses a clearly fictional, server-only development session; it is not proof of real hosted authentication. Desktop/mobile Chromium cover list and item edits/deletion, step reorder by keyboard, progress, conversion, filtering, source deletion, and retained memory. Reduced motion is enabled. Screenshots live in ignored `test-results/`.

Application gates: lint and typecheck passed; all 28 unit tests passed; production build passed. Full Playwright regression passed five tests with one intentional desktop skip for the mobile-only check. Impeccable's single completed-surface detector returned no findings; fresh visual review confirmed the established world and prompted documentation and inline transport-recovery fixes. The in-app browser and filesystem image viewer cannot initialize their Windows sandbox; standalone Playwright and read-only screenshot loading provide fallback evidence.

## Deliberately open

- Clean-from-zero migration replay on an empty disposable hosted database has not been run. Applying migrations to the existing hosted schema is not equivalent to reset verification.
- Real two-account pairing, concurrent final-slot attempts and genuinely overlapping database-session reorder/conversion timing remain for final integration. The hosted suite verifies stale-version rejection and sequential retry behavior, not simultaneous connections.
- Earlier phase pgTAP suites are present but were not all rerun in the hosted Phase 4 verification migration.
- Human screen-reader smoke and production-scale performance measurements remain release checks.
- Application deployment, calendar/reminder completion and media upload remain their own phases.

Phase 4 is implemented with hosted negative-policy evidence; the complete release/phase gate is not claimed while these items remain open. Schema rollback is forward-corrective; do not drop populated tables to roll back the app.
