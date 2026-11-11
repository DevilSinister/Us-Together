# Durable bulk upload recovery

Date: 2026-10-21. Branch: `codex/durable-bulk-uploads`, created from clean `codex/video-upload-recovery` at `2cab188`. Decision: ADR-050. No hosted deployment, migration, account/production-data mutation, APK publication or PR is part of this change.

## Behavior

- Originals/captions are persisted before network work, with separate IndexedDB file/job/batch stores, account/entry scope, a 24-hour selection lifetime, 30 queued files per entry and 90 files / 600 MiB across entries. Browser quota failures refuse a selection atomically. Sign-out purges queued copies; other-owner/expired jobs are removed on opening. Missing local bytes are reported while recoverable files continue.
- One Web Lock writer owns an entry across tabs. Reload/navigation restores its files, allocation, transfer reference, completed-transfer checkpoint and deliberate pause. Returning from browser back/forward cache reopens the writer. Reopening the entry resumes; continuous transfer with a closed/background app is not promised.
- Bounded TUS attempts yield deferred work instead of leaving an unresolved promise. A 90-second inactivity watchdog stops silent requests while allowing healthy slow progress. The visible-page timer checks every five seconds; per-file backoff grows from 15 seconds to five minutes, with at least five minutes for throttling. Permanent rejections settle independently. Retry remaining reschedules waiting/failed jobs.
- Preparation, transfer and finalization have separate checkpoints. Stable request UUIDs, parent/uploader/MIME/size/caption checks, primary-key collision handling and Storage-object reconciliation prevent duplicate allocation after lost responses. Completed originals retry finalization only. Expired upload authorization can be renewed for the same uploader's unfinished row without overwriting an original; expired TUS references restart against that row. Long manual pauses renew before resuming bytes.
- The new same-origin POST endpoint has a 60-second abortable client request, body/input/response validation and no-store responses. The expected uploader must equal the authenticated server user before mutation. Restored TUS URLs must match the direct Storage origin/path before receiving credentials. Service credentials remain in Edge code. No new sensitive logging is added.
- The existing upload tiles/palette are retained; saved/uploading/finishing/waiting counts, Retry remaining, storage/recovery messages and retention copy make each stage visible.

## Final gates

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm run test` | PASS, 283 tests in 48 files, exit 0 |
| `npm run build` | PASS, exit 0; this task's dev server stopped first |
| Desktop Chromium + Pixel 7 | PASS, 12/12 in `playwright.durable.config.ts`, exit 0 |
| Impeccable changed-component detector | PASS, exit 0 |
| Diff/credential/log review | PASS: whitespace check, changed/new source credential-pattern scan and explicit logging review; no new sensitive logs |
| Graphify | PASS: code refresh, 2929 nodes / 6835 edges; upload-session/store sources confirmed in graph |

The browser set covers mixed photo/video reload and navigation recovery, persisted keyboard Pause/Continue, exclusion of another tab, removal of local bytes after success, atomic full-device failure, sign-out cleanup, expired/other-owner purge, Retry remaining without duplicates, missing local bytes, a rejected photo isolated from a 30-file batch, and silent video-frame previews. Reduced motion and mobile overflow are checked; desktop/mobile screenshots in ignored `.impeccable/qa/durable-*` were inspected. The in-app browser additionally opened the local paired preview and selected fictional files, but was not used as evidence for interrupted TUS transport.

Unit/local integration evidence includes stale-account denial before mutation, stripping client ownership claims, safe error categories, processing-only recovery, prepare/remove races, throttling, sign-out/storage lifecycle, long-pause renewal, and stalled-request/manual-pause behavior. A real local HTTP TUS server checks expired-token refresh, throttling, accepted bytes with a lost PATCH response, and a new upload instance resuming from a saved URL via HEAD with identical final bytes and exactly one creation.

The first browser pass exposed a five-second lock handover delay during navigation/React lifecycle replay; the retry interval was corrected and the final focused runs pass. The first sandbox Vitest attempts failed before executing tests because Windows refused temporary-file renames; final tests ran outside that sandbox. An intermediate typecheck found an untyped deferred promise in a test; it was corrected before final lint/types/build. These failed attempts are not passing evidence.

## Not run / release limits

- Hosted Edge runtime/typecheck/deployment, the hosted video-recovery/media specs, real-account Storage acceptance, expired hosted-lease/concurrent prepare stress, and production weak-network reproduction: NOT RUN. Local authorization helpers, service boundaries and real local transport are tested; they do not prove the changed Edge handler has executed in the hosted runtime.
- Migration reset/application/list, negative PostgreSQL/RLS suite and database/security advisors: NOT RUN; no schema, RLS policy or grant changes. Existing replay/advisor carryovers remain open. The Edge authorization changes still require hosted acceptance before publication.
- Physical Android/TWA, Doze/background/app-kill, Android assembly, screen reader, 200% zoom, maximum-size originals and the complete cross-product browser suite: NOT RUN. Local reload/navigation is distinct from physical-device evidence.
- No new dependencies, native worker or APK change. Browser storage can be evicted/cleared, and unsent files require the same device and signed-in person. Server budgets remain enforced, so throttled work can wait for its budget window.
- Graphify refreshed code without clustering and preserved the older semantic corpus. JSON files `design.json`/`assetlinks.json` produced no nodes. New prose was not semantically re-extracted; the old visual HTML/community report remains historical. The refreshed graph is a navigation aid; current source/contracts remain authoritative.

## Budget headroom follow-up — 2026-10-27 (ADR-051)

Owner report: many photos stayed in "Waiting" while online; restart or remove-and-re-add left broken previews. Cause: the app's own per-account media budgets (60 allocations/hour charged on every prepare, including recovery; 120 reads/minute), not a Supabase platform limit. Fix: migration `20261027120000_media_budget_headroom.sql` (300/600/600), charge-on-new-work in `memory-media`, honest online-deferred copy, and bounded thumbnail retry.

- PASS: `npm run lint`; `npm run typecheck`; `npm run test` (49 files, 287 tests including new throttled-batch, 429-copy and online-summary cases); `npm run build`; diff secret scan.
- NOT RUN: `npm run test:rls`, migration reset/application/list and advisors (Docker is not running on this machine); Deno check of the Edge Function (Deno not installed); hosted 429 reproduction; browser verification of the online-deferred copy (the preview session never calls the budgeted service, so it cannot produce a 429 locally). The offline copy covered by `durable-uploads.spec.ts` is unchanged.

## Service-version tolerance — 2026-11-10 (ADR-052)

Owner report: every upload fails, with errors and a connectivity message while online. Cause: the web client from PR 14 went live on 2026-10-30 without the matching `memory-media` deployment. The hosted function assigns its own allocation ID and the client refused it. Each attempt left an unused row and spent allocation budget, and the resulting 429 was worded as a lost connection.

Fix: the client uses the ID the service returns and never reserves twice for one file; stale reservations are published or released when the entry is opened; connection wording is limited to real connection loss.

- PASS: hosted diagnosis with the isolated fixture account. `prepare` with a client ID returned a different ID and no `uploaded` field; a repeat returned a third ID. TUS transfer, finalize and repeat finalize succeeded. Finalizing a row with no stored original returned 422 "Upload has not finished. Resume it or try again." and left it `failed`; remove succeeded.
- PASS: the shipped `prepareAllocation` and `settleStaleUploads` run against the hosted function with the fixture account (2 cases, run twice): one row per file across a retry, transfer and finalize to `ready`, a stored-but-unfinished original published, an empty reservation released. The fixture memory read back at its original single ready row afterwards.
- PASS: `npm run typecheck` (exit 0); `npm run lint` (exit 0); `npm run test` (50 files, 300 tests, exit 0); `npm run build` (exit 0, no dev server running).
- PASS: desktop Chromium and Pixel 7, `durable-uploads.spec.ts` and `multi-photo-upload.spec.ts`, 10/10, through a temporary config that points at the installed Chromium build. `.env.local` was flipped for the run and restored byte-for-byte.
- An intermediate typecheck failed on a tuple type in the new test; corrected before the final run.
- NOT RUN: a signed-in browser upload against the hosted project through the Next route, the hosted Playwright specs, and physical Android/TWA. The hosted evidence above calls the Edge Function directly, so the `/api/entry-uploads` layer is covered by unit tests only. The stale sweep was not observed in a browser, because the preview session has no server rows; its age filter is unit-tested and its service calls are hosted-tested.
- NOT RUN: `npm run test:rls`, migration reset/application/list, advisors and a Deno check of the Edge Function. This change adds no schema, policy, grant or Edge code. The ADR-051 migration and Edge Function are still undeployed.
- Diff secret scan: PASS. The diagnostic scripts stay in ignored `supabase/.temp`.

## Publication order

Apply migration `20261027120000_media_budget_headroom.sql` and deploy the updated `memory-media` Edge Function with its shared `upload-allocation.ts` dependency before the web change, then run the hosted recovery/media fixtures and device acceptance. Since ADR-052 the web client works with either function version, so this order is recommended, not required. As of 2026-11-10 the hosted function is still the pre-ADR-050 version and the migration is not applied. No live deployment is claimed here.

Official references reviewed: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [Supabase changelog](https://supabase.com/changelog), installed tus-js-client 4.3.1 source, and installed Next.js 16.3.4 client/server-action guides. The markdown changelog endpoint could not be fetched in this environment; the official HTML changelog was reviewed instead.
