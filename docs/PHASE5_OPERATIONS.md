# Plan reminders and attachments

## Scheduling and failure handling

Supabase Cron invokes `private.deliver_due_plan_reminders(100)` every minute. The function is a security invoker, not an exposed API, and execution is revoked from public, anon, authenticated, and service_role. Only a trusted database operator/scheduler runs it.

A pending reminder becomes delivered after the in-app fan-out commits. Each partner must still have active membership and enabled in-app/plan preferences at delivery. Suppressed notifications are not replayed later if preferences change. Completion and cancellation cancel pending reminders. Rescheduling preserves each pending reminder's relative offset; reminders moved into the past become cancelled. Restoring a plan does not resurrect cancelled reminders; remove/re-add them deliberately.

Each failed attempt rolls back the entire fan-out for that reminder. Backoff is 60, 120, 240, and 480 seconds, checked on the minute scheduler tick. The fifth failure marks the row failed. Store no exception details or plan content: the sole public error class is `delivery_failed`. Successful and failed attempt counts persist; a database outage rolls back the transaction and pg_cron retries on its next scheduled run.

Use the Cron dashboard to inspect runs and pause/resume this named job. Operators should monitor oldest eligible pending age and failed count without selecting titles, descriptions, attachment paths, or notification content. Investigate the underlying failure before a manual retry. A trusted SQL operator may reset a specifically authorized failed row to pending with attempts zero, next_attempt_at null and last_error_code null; preserve its delivery_key to retain deduplication. Do not grant the worker or retry capability to application roles.

## Uploads and cleanup

No service-role key, OAuth credential, or external service is required. Normal authenticated Supabase clients enforce RLS. The server accepts a File up to 2 MiB and validates its signature; the Server Action envelope limit is 3 MB. Metadata is created before the binary with ready=false, then finalized. An interrupted upload remains visible as unfinished with a Remove attachment action. Removal deletes the binary first, then its metadata, so retries remain safe. Direct metadata deletion with a retained object is rejected.

Each plan can contain 20 attachments, 50 checklist items and five reminders. Plan deletion requires removing attachments first and retains existing memories with nullable source linkage. Account/couple deletion in Phase 8 must perform the same Storage-first cleanup, since attachment FKs intentionally prevent orphaning objects.

Download uses `GET /api/plan-attachments/[id]`: fresh authenticated membership/RLS checks, ready-state check, content-signature check, forced download, private/no-store caching, and nosniff. Filenames and raw paths do not enter URLs or logs. File signatures are a type check, not a malware scanner.

## References

- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Cron job scheduling and history](https://supabase.com/docs/guides/cron/quickstart)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Phase 5 verification](PHASE5_VERIFICATION.md)
