# Phase 5 verification — 2026-09-02

## Delivered

Plans now have upcoming/month/week views, a mobile day agenda, bounded pagination, status filters, dedicated detail/edit routes, cancellation/restoration, confirmed deletion, and completion-to-memory continuity. Details include location, optional coordinates/HTTPS map link, budget/currency, ordered editable checklist, reminder controls, and private attachments.

Wall times resolve through the selected IANA zone. Nonexistent dates/DST gaps are rejected; repeated times require an explicit earlier/later occurrence. The editor previews the resolved time in the device zone, preserves input on errors, focuses the first invalid field, and associates field explanations with controls.

Shared edits use a parent version. Checklist RPCs lock the parent, validate full reorder permutations, and defer the unique position constraint until transaction end. Collection limits are enforced in PostgreSQL: 50 checklist entries, five reminders, 20 attachments. Actor/tenant values come from the server session and RLS. Remaining active members can manage retained shared plans.

## Hosted evidence

Applied migrations by name (the connector assigns its own hosted timestamps; names plus SQL identify correspondence):

- `phase5_plans_calendar`: versioning, attachments, transactional mutations, private reminder job, scheduler.
- `phase5_verification`: initial rollback-only 33-assertion gate.
- `phase5_integrity`: uploader FK index, child collection limits, attachment deletion guard.
- `phase5_plan_details_and_retries`: map fields in the edit RPC, bounded retry state and per-reminder delivery transactions.
- `phase5_final_verification`: complete rollback-only 40-assertion gate.

The final suite in `supabase/tests/database/0006_plans_calendar_rls.test.sql` passes all 40 assertions. It checks own/foreign/former-member reads, ownership immutability, stale/missing revisions, interval rejection, checklist reorder and limits, reminder scheduling and rescheduling, forged delivery/retry state, notification preference suppression and content minimization, duplicate prevention, bounded backoff/failure, attachment path authorization, and anonymous denial. Fixtures, temporary failure triggers, and the temporary pgTAP installation roll back. No fixture users or temporary failure triggers remain. The hosted migration list confirms all 13 expected migrations through Phase 5.

The `us-together-plan-reminders` pg_cron job runs every minute as postgres; successful scheduler executions were observed. It locks eligible plan/reminder rows with SKIP LOCKED, processes at most 100 reminders per run, fans out only to active members whose preferences permit it, and uses a unique delivery-key/recipient notification key. Each reminder has an isolated transaction block. Failure rolls back its notification fan-out, retries with exponential backoff, and stops after five failed attempts. Error state stores only `delivery_failed`.

Security advisors retain the pre-existing intentional RPC-only invitation-table notice and disabled leaked-password-protection launch warning. The new unindexed uploader FK finding was corrected in `phase5_integrity`. The final performance advisor reports only 32 informational unused indexes. The upcoming query uses a sequential scan on the tiny current table; the existing `(couple_id, starts_at, id)` and planned-only indexes provide its intended access paths. This is not a production-scale performance claim.

## Attachments

A private `plan-attachments` Storage bucket accepts PDF, PNG, and JPEG up to 2 MiB. The server validates size and file signature before uploading, derives the object path, and keeps unfinished metadata recoverable after interrupted uploads. The authenticated download route performs fresh RLS authorization, verifies the signature, uses no-store headers, and forces download. Raw object paths and signed URLs never enter the rendered page. A file must be removed through Storage before its metadata; a plan must have no attachments before deletion. This avoids silently orphaning binaries.

The developer preview deliberately offers no fake upload or reminder-delivery behavior. Signature rejection is unit-tested and metadata/path access is covered by hosted SQL tests. A real authenticated Storage upload/download/delete round trip remains a final-integration check; it has not been represented as browser-tested.

## Application and visual evidence

- Final `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all passed.
- 35 unit assertions cover existing domains plus calendar boundaries, multi-day intervals, date-line/timezone behavior, DST gaps/overlaps including half-hour transitions, invalid inputs, and binary signature/size rejection.
- Full Playwright regression: nine passed, one intentional desktop skip of a mobile-only test.
- The Phase 5 journey covers create, budget/coordinate persistence, validation recovery, checklist editing/reordering/completion, reminders/rescheduling, month/week navigation, cancellation/restoration/deletion, and keyboard/reduced-motion/overflow behavior.
- Existing paired and bucket journeys continue to exercise plan-to-memory and bucket provenance.
- Desktop/mobile screenshots are in ignored `test-results/plans-*.png`. Visual review preserved the existing design; the wrapping Add step action and field-error associations were corrected.
- A final secret-pattern scan covered 46 changed/new deliverable files with no findings; the Phase 5 code contains no console/logger calls or embedded deployment identifiers. `git diff --check` passed.
- The Impeccable mechanical detector reported no findings. A separate finish reviewer checked the UI; the surface brief records shipped behavior.
- The in-app browser/image runtime cannot initialize the Windows sandbox. Standalone Playwright and read-only screenshot loading are the explicit fallback.

## Final integration and release obligations

ADR-014 still defers real two-account pairing, genuinely simultaneous database-session timing, and clean-from-zero replay on a disposable hosted database. This phase does not silently claim those gates. The real-account attachment round trip, human screen-reader smoke, production-scale measurements, and application deployment also remain integration/release checks.

Schema changes are forward-compatible with older application reads. Rollback is an application rollback or forward corrective migration; do not drop populated tables. Disabling the specific reminder cron job pauses delivery without deleting pending state.
