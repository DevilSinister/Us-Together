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

## Publication order

Deploy the updated `memory-media` Edge Function with its shared `upload-allocation.ts` dependency before the web change, then run the hosted recovery/media fixtures and device acceptance. The client refuses a replacement UUID from an older processor. No live deployment is claimed here.

Official references reviewed: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [Supabase changelog](https://supabase.com/changelog), installed tus-js-client 4.3.1 source, and installed Next.js 16.3.4 client/server-action guides. The markdown changelog endpoint could not be fetched in this environment; the official HTML changelog was reviewed instead.
