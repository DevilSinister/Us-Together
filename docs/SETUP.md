# Development Setup

## Current status

The application is runnable without containers. JavaScript checks and the fictional development preview do not require Supabase. Real authenticated flows use the configured managed Us-Together project; database changes use reviewed hosted migrations. See ADR-014 and [Phase 4 evidence](PHASE4_VERIFICATION.md).

## Prerequisites

- Node.js 22 or newer, as declared in `package.json`
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

## Phase 5 setup

Use Node.js 22 or newer (this phase was verified with Node 24); current Supabase client support has moved beyond Node 20. Existing public Supabase configuration is sufficient: no additional secret key or third-party credential is needed.

Apply all Phase 5 migrations by their verified names/SQL, respecting existing hosted/local timestamp correspondence. The migration enables pg_cron and registers `us-together-plan-reminders`. Verify its active state and successful runs in the Cron dashboard. The private plan-attachments bucket and policies are migration-managed. See [Phase 5 operations](PHASE5_OPERATIONS.md).

Developer preview supports calendar/checklist editing. Memory and moment galleries, captions and file comments can be tested with real browser-local files. Reminders remain in Plans. Plan attachment binaries still require an authenticated account.

## Phase 6 setup

Apply the complete Phase 6 migration sequence and deploy the `memory-media` Edge function with JWT verification enabled. Include its shared `src/lib/memories/media.ts` dependency. Supabase supplies the built-in Edge environment; do not add a service-role key to Next.js. The config records JWT verification and the lockfile pins the TUS client and image decoder versions.

Run the regular lint, typecheck, unit, browser and build gates. Typecheck the Deno handler separately with `deno check supabase/functions/memory-media/index.ts`; the Next.js tsconfig intentionally excludes Deno functions.

The hosted binary runner is `node tests/integration/memory-media-hosted.mjs`. For the real desktop/mobile upload journey set `PHASE6_HOSTED=true` and run `npx playwright test tests/e2e/memory-media-hosted.spec.ts --workers=1`. These tests require disposable fixtures; ordinary browser runs explicitly skip them. Fixture credentials belong only in ignored `supabase/.temp/phase6-fixture.json`, never traces or committed examples. Apply the paired cleanup after media removal and remove that local credential file. See [Memory media operations](PHASE6_OPERATIONS.md) for fixture sources, recovery and the decoder asset dependency.

## Free location lookup and preview photo testing

No Google Places key or billing account is needed. Photon/OpenStreetMap is enabled by default; optional server environment variables are LOCATION_SEARCH_ENABLED=false to disable it and PHOTON_BASE_URL to use another HTTPS Photon instance. The default public community endpoint is suitable for reasonable personal-project traffic, may throttle, and has no uptime guarantee. For growth, configure an appropriate provider or self-hosted instance. See [Photon service policy](https://github.com/komoot/photon#demo-server) and [API documentation](https://github.com/komoot/photon/blob/master/docs/api-v1.md). The public Nominatim endpoint is not used for autocomplete.

1. Run the app locally with DEV_LOGIN_ENABLED=true and select Enter paired preview.
2. Open Memories > Add a memory, or Moments > Add milestone.
3. Choose photos or videos (multiple selection), add individual captions and save.
4. Open the entry to view files, edit captions and post comments. Preview bytes stay in IndexedDB in this browser/session; they are not sent to the shared account. Entries expire after 24 hours and expired files are removed on subsequent access; clearing site storage removes them immediately.
5. Open a photo, add a comment, and edit its caption under Caption and file options. Open Home → Open gallery to see the same caption/comment; switch grouping between memory/moment and date. Each entry previews six photos; Open full gallery includes every photo and video.
6. Open Home > Open calendar to see plans, memories and moments together.

Location queries go to Photon only after typing at least three characters. Use my location requests browser permission and sends the position for nearby lookup. Coordinates are not stored or shown. Suggestions credit OpenStreetMap contributors under its [data license](https://www.openstreetmap.org/copyright). Location can always be entered manually when lookup fails.

### Portable dependency installation

Use Node.js 22 or newer. Keep the pinned cross-platform supabase package; its platform binaries are optional dependencies. Do not add cli-windows-x64 as a direct dependency, which breaks Linux/Vercel installation. Type checking generates Next route types before running TypeScript, including on fresh CI checkouts.
