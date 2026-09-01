# Operations

## Observability

Monitor availability, request latency/error rate, database latency/connections/locks, auth failures, storage/upload failures, signed URL errors, job backlog/age/retries, email/push/provider errors, and client performance. Alerts should identify the subsystem and safe correlation ID without content.

Dashboards and logs must not include note bodies, wishlist secrets, vault metadata/content, tokens, raw media paths, signed URLs, or exports.

## Scheduled work

Reminders, scheduled notes, notifications, cleanup, exports, token refresh, and media derivatives use idempotent jobs with:

- Deterministic delivery/operation key
- Due time and lifecycle state
- Attempt count, last safe error class, next retry, and completion time
- Bounded exponential retry with dead-letter/failed state
- Concurrency control so parallel workers do not duplicate effects

Alerts cover oldest pending age and failure rate. Manual retry preserves idempotency.

## Backups and recovery

- Enable production backup/PITR capabilities appropriate to launch risk and document retention once pricing/legal choices exist.
- Test restore into an isolated environment before launch and periodically afterward.
- Storage recovery/versioning strategy is documented separately from database backup; database metadata alone does not restore media.
- Record recovery point and recovery time objectives before public launch.
- Exports are not backups and expire from secure storage.

## Capacity and limits

Set configurable limits for image/video/audio size, dimensions/duration, per-user/couple quota, rate limits, signed URL lifetime, invite lifetime/attempts, export frequency, and collection page size. Initial numerical values are selected from measured platform constraints in implementation and recorded here/central configuration—not scattered literals.

Monitor growth of media, database rows, indexes, egress, realtime connections, and job volume. Do not preload complete galleries or vaults.

## Database maintenance

- Run current Supabase database/security advisors before releases and on a schedule.
- Review slow queries and plans, RLS predicate performance, unused/redundant indexes, locks, bloat, and connection usage.
- Apply schema changes through migrations and expand-migrate-contract for risky evolution.
- Test migration duration/locking on staging-sized data before production.

## Dependency and security maintenance

Pin dependencies and commit lockfiles. Review automated alerts and primary-source release notes; prioritize auth, framework, database, parser, media, WebAuthn, and OAuth vulnerabilities. Emergency patches still pass focused negative tests and production build.

Rotate secrets on schedule and immediately after suspected exposure. Rotation includes deployed environments, provider credentials, CI, scheduled endpoints, and stale preview scopes.

## Incident response

1. Triage severity and affected boundary.
2. Contain: disable feature/integration, revoke keys/sessions/URLs, block abusive paths.
3. Preserve minimal safe evidence and timestamps.
4. Determine affected tenants/data without broad content access.
5. Patch forward and run focused plus mandatory negative tests.
6. Restore/verify service and monitor recurrence.
7. Notify users/regulators according to future policy/legal obligations.
8. Write a blameless record and update controls/docs.

Security incidents involving possible tenant or secret-content disclosure receive highest priority.

## Privacy operations

Support authenticated export, individual deletion, account deletion, couple departure, and couple deletion according to the documented lifecycle. Operations tooling must use least privilege, audit access, avoid displaying content by default, and never bypass policy merely for convenience.

## Routine cadence

- Per deploy: checks, migrations, smoke, negative authorization sample, monitoring review
- Weekly: job failures, auth/storage anomalies, provider errors, dependency alerts
- Monthly: advisors, slow queries, quotas/cost, stale credentials/preview environments
- Quarterly or before major release: restore drill, access review, threat model, incident exercise, full RLS/storage suite
- After each major phase: update documentation and Graphify corpus; review god nodes/surprising connections for unintended coupling
