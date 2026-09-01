# Deployment

## Environments

Maintain isolated local, preview/staging, and production environments.

| Environment | App | Data services | Purpose |
| --- | --- | --- | --- |
| Local | local Next.js | local Supabase | development and full reset tests |
| Preview/Staging | Vercel preview/staging | non-production Supabase | migrations, OAuth callbacks, E2E, release acceptance |
| Production | Vercel production | production Supabase | real users |

Preview deployments never fall back to production data or secrets. If a Supabase project is shared among preview branches, test isolation and migration coordination must be explicit; dedicated staging is preferred for release validation.

## Secret configuration

Configure browser-safe URL/publishable values and server-only Supabase secret/service credentials in Vercel environment scopes. Release 2 adds Google credentials and scheduled-job authentication. Values are never committed, printed in CI, placed in client bundles, or copied into documentation.

## Deployment sequence

1. Review current framework/Supabase advisories and dependency lockfile.
2. Run lint, types, unit, RLS/integration, E2E, production build, and secret scan.
3. Apply migrations to staging from a clean verified migration chain.
4. Deploy compatible application to staging and run production-like smoke/negative tests.
5. Confirm storage buckets/policies, auth redirect allow-list, email delivery, rate limits, headers, and observability.
6. Back up/confirm recovery posture for risky production schema work.
7. Apply backward-compatible production migration.
8. Deploy application and run safe smoke checks.
9. Monitor errors, latency, auth, jobs, and database health.

Never deploy application code that requires a schema not yet present. Destructive/backfill migrations use expand-migrate-contract across releases.

## Vercel configuration

- Pin Node/runtime expectations and framework version.
- Separate preview and production environment variables.
- Configure canonical domain, HTTPS, redirect/callback origins, secure headers, and region decisions based on users/data requirements.
- Protect scheduled/webhook endpoints with platform-supported authentication and replay controls.
- Keep personalized/authenticated responses out of public caches.
- Confirm request/body/runtime limits for uploads; direct constrained Storage upload is preferred for large media.

## Supabase production configuration

- RLS on every exposed table and explicit Data API grants.
- Private Storage buckets and tested object policies.
- Email provider/templates/redirect URLs and abuse limits.
- Database indexes, connection pool mode, resource limits, backups/PITR option, and advisors reviewed.
- Realtime only on intended tables/channels.
- Network/restriction options and secret-key access minimized.
- Migration history matches the repository.

## Google Calendar release configuration

Use environment-specific OAuth clients or verified callback configuration, exact allow-listed redirects, consent-screen details, minimal scopes, and secure token storage. Preview callback sprawl is avoided; use a stable staging origin for OAuth acceptance. See [Google Calendar](GOOGLE_CALENDAR.md).

## Rollback and forward fix

- Application rollbacks are safe only while database changes remain backward compatible.
- Database migrations are not blindly reversed in production. Prefer a forward corrective migration, especially after data transformation.
- Feature flags/disabled routes contain incomplete R2 features without exposing their data paths.
- Revoke credentials or disable integrations immediately if security is in question.

## Production acceptance

- Signup/verification/login/recovery work on the canonical domain.
- Couple A cannot access Couple B through API or Storage.
- Uploads and signed media URLs are private and bounded.
- Email/jobs deliver once and expose no secret content.
- Mobile/desktop critical journeys and accessibility smoke pass.
- Logs, analytics, error reporting, and headers contain no sensitive material.
- Current release, migration, and rollback identifiers are recorded.
