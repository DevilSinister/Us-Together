# Local Setup

## Current status

The Phase 1 application foundation is runnable. JavaScript checks do not require Supabase; authenticated flows and database policy tests require the local Supabase stack.

## Prerequisites

- Node.js 20.9 or newer, as declared in `package.json`
- npm unless an ADR deliberately selects another package manager
- Docker-compatible runtime for local Supabase
- Current Supabase CLI, with commands discovered using `supabase --help`
- Git

Version requirements must be written here when the application is scaffolded.

## Bootstrap

```bash
npm install
supabase start
supabase db reset
npm run dev
```

Copy `.env.example` to `.env.local` and fill the public local values printed by `supabase start`. Missing or invalid values produce a safe configuration error instead of exposing credentials.

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

## Supabase local setup

1. Supabase configuration already exists in `supabase/config.toml`.
2. Start the local stack and record the local URL/publishable key in the uncommitted local environment file.
3. Apply all migrations from a clean database.
4. Phase 1 deliberately has no demo user seed; Phase 2 adds isolated fictional couples when the couple schema exists.
5. Generate database TypeScript types and verify no drift.
6. Run RLS tests and advisors.

New migrations must be created through the current CLI migration command, not by inventing filenames. Schema iteration happens locally; committed migrations must reproduce the final state from zero.

## Email authentication

Local development uses the Supabase local mail-capture service or current equivalent. Production requires verified redirect URLs, email templates, rate limits, and an approved SMTP/provider configuration. Signup verification and password recovery URLs must return only to allow-listed application origins.

## Storage

Migrations/configuration create private memory buckets and, in R2, a separately controlled vault namespace/bucket. Seed setup may use small fictional media assets with documented licenses or generated demo assets; never use personal photos.

## Planned Phase 2 demo seed

Seed data is deterministic and clearly non-production:

- Alex and Maya in Couple A
- Jordan and Sam in Couple B for isolation tests
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
npm run build
```

Browser workflow automation will be added when stable authenticated couple flows exist. The first public and authentication surfaces were manually verified at desktop and mobile viewports with no browser errors.

Document any additional media worker, email capture, database type generation, format-check, or Graphify update command when introduced.

## Troubleshooting policy

Check the exact error, current official docs/changelog, local service status, migrations, and logs with secrets redacted. After two or three failed repeats, reconsider the approach rather than looping. Keep fixes and newly discovered setup requirements in this document.
