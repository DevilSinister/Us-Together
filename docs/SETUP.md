# Development Setup

## Current status

The application is runnable without containers. JavaScript checks and the fictional development preview do not require Supabase. Real authenticated flows use the configured managed Us-Together project; database changes use reviewed hosted migrations. See ADR-014 and [Phase 4 evidence](PHASE4_VERIFICATION.md).

## Prerequisites

- Node.js 20.9 or newer, as declared in `package.json`
- npm unless an ADR deliberately selects another package manager
- Access to the confirmed hosted Supabase project; Docker/Podman is not required
- Current Supabase CLI, with commands discovered using `supabase --help`
- Git

Version requirements must be written here when the application is scaffolded.

## Bootstrap

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and fill the configured hosted URL and publishable key. Save the supplied project reference there as server-only `SUPABASE_PROJECT_ID`; verify its project name before remote writes. Missing or invalid values produce a safe configuration error instead of exposing credentials.

## Environment variables

`.env.example` contains names and safe comments only. Current Phase 1 variables are:

```dotenv
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Server secrets and future integration credentials are added only when a narrowly authorized workflow needs them.

Use the current Supabase publishable/secret key model. If the project must support legacy anon/service-role names, document them explicitly without exposing values. Only browser-safe values may use `NEXT_PUBLIC_`.

Local `.env*` files containing values are ignored. Never copy production credentials to local/preview environments.

## Hosted database workflow

1. Resolve the saved project reference and verify Us-Together before mutations. Never substitute another project from a connector list.
2. Review SQL and current Supabase changelog/docs; discover CLI commands with help before use.
3. Apply reviewed migrations through the connected Supabase migration tool; inspect the migration list and schema afterwards.
4. Run rollback-only fictional negative tests and database/security advisors. The Phase 4 verification migration documents the read-only-query connector workaround.
5. Regenerate types and check the application. Never store project references or credentials in tracked examples.
6. Before release, replay all migrations on a separately authorized empty test database. Do not reset the populated hosted project.

## Optional local Supabase alternative

1. Supabase configuration already exists in `supabase/config.toml`.
2. Start the local stack and record the local URL/publishable key in the uncommitted local environment file.
3. Apply all migrations from a clean database.
4. `seed.sql` deliberately contains no hosted/demo accounts. pgTAP creates rollback-only fictional users, while the server-only developer session provides deterministic Alex + Maya and solo fixtures for browser testing.
5. Generate database TypeScript types and verify no drift.
6. Run RLS tests and advisors.

New migrations must be created through the current CLI migration command, not by inventing filenames. Schema iteration may use an authorized hosted test database; committed migrations must reproduce the final state from zero. Local reset evidence is optional here, but clean replay on a disposable database remains required before release.

## Email authentication

Local development uses the Supabase local mail-capture service or current equivalent. Production requires verified redirect URLs, email templates, rate limits, and an approved SMTP/provider configuration. Signup verification and password recovery URLs must return only to allow-listed application origins.

## Storage

Migrations/configuration create private memory buckets and, in R2, a separately controlled vault namespace/bucket. Seed setup may use small fictional media assets with documented licenses or generated demo assets; never use personal photos.

## Phase 2 test fixtures

Test data is deterministic and clearly non-production:

- Alex and Maya in Couple A
- Additional fictional users/couples in rollback-only pgTAP isolation tests
- Plans, bucket items/subtasks, memories, wishlist items, shared/private notes, milestones, and notifications
- Purchaser secrets and private notes that prove non-disclosure

Auth seed credentials live only in local/test setup and are never reused in deployed environments.

## Development commands

The current foundation provides:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:rls
npm run test:e2e
npm run build
```

Playwright runs the paired Alex + Maya fixture at desktop and Pixel-sized mobile viewports, including reduced motion, keyboard focus, and the direct Plan-to-Memory path. `npm run test:rls` is the optional local CLI runner and requires a local runtime; hosted rollback-only verification is supported without it. Do not report that local command as passed when using hosted evidence.

Document any additional media worker, email capture, database type generation, format-check, or Graphify update command when introduced.

## Troubleshooting policy

Check the exact error, current official docs/changelog, local service status, migrations, and logs with secrets redacted. After two or three failed repeats, reconsider the approach rather than looping. Keep fixes and newly discovered setup requirements in this document.
