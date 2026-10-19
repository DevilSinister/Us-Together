# Uploads in the grid and device local time — verification

Date: 2026-10-19. Branch: `codex/video-upload-recovery`. Decisions: ADR-047 (local time), ADR-048 (uploads).

## What changed

- **Local time.** The device zone replaces the `UTC` default. `TimeZoneSync` saves it to the profile; profile and onboarding show it instead of a text field; notes, drawings, notifications and the new-memory default date use the reader's zone on the server. The first move away from `UTC` re-anchors the person's own UTC-typed plans to the same wall-clock time.
- **Uploads.** Files send as soon as they are chosen and appear as developing tiles in the entry grid, with one Pause/Continue status line; failures stay on their own tile with Try again; a dropped connection waits and resumes by itself. Unfinished files are shown only to their uploader (`entryMedia.mine`). `uploader.tsx` is replaced by `upload-queue.ts`, `media-transfer.ts`, `use-entry-uploads.ts` and `upload-tiles.tsx`.

No migration, RLS policy, Storage rule or Edge Function changed.

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 (first run found `Date.now()` in render and a ref-in-cleanup warning; both fixed) |
| `npm run test` | PASS, 261 tests in 43 files (new: `upload-queue.test.ts` 8, `zone.test.ts` 5; `upload-batch.test.ts` rewritten after `runUploadBatch` was removed) |
| `npm run build` | PASS, exit 0 |
| Playwright, desktop Chromium + Pixel 7 | PASS 4/4: `multi-photo-upload.spec.ts` (picker tiles, send on save, bad photo isolated with Try again/remove, 28 more files, keyboard Pause holds the batch, keyboard Continue, 30 photos, reduced motion, no horizontal overflow) and `video-thumbnails.spec.ts`. Run through a temporary config pointing at the installed Chromium build, because this Playwright version expects a browser build that is not installed; the config was deleted afterwards. The first run failed on two out-of-date assertions in the specs (pause count taken before the in-flight file landed; the old filename-based remove label), which were corrected. |
| In-app browser, paired preview | PASS: profile forced to UTC, a 7:00 PM plan saved under UTC, reload in the real Asia/Karachi zone shows the plan at 7:00 PM "Shown in Asia/Karachi"; uploads sent in order, Pause held the batch, removal of a waiting file, Continue completed (9 photos); new-memory picker tiles, unsupported-file message and default local date; 375px layout with no overflow and 44px remove targets; no console errors; /notifications, /notes, /drawings, /profile, /plans, /home all 200. |
| Impeccable detector on changed UI files | PASS after replacing one off-ramp `text-[0.6875rem]` with `text-xs` |
| `git diff --check`, secret/log scan | PASS; new logs carry provider error codes only |

## Not run

- `tests/e2e/video-upload-recovery.spec.ts` was rewritten for the new interface (rows are identified by creation time instead of pre-upload captions) but **not run**: it signs a disposable fixture into the hosted project and writes and removes real Storage objects, which needs the owner's go-ahead.
- Hosted re-anchoring of real UTC plans has not been observed; it runs the first time each partner opens the deployed app after this change. The in-app browser run proves the developer-state path and the pure function is unit-tested; the hosted path uses the existing `update_plan_details` RPC.
- Migration reset/application/list, negative RLS suite, database/security advisors: not applicable (no schema or policy change) and not run.
- Android/TWA device acceptance, human screen reader and 200% zoom, Graphify refresh: not run.
- `tests/e2e/shared-calendar-media.spec.ts` and `memory-media-hosted.spec.ts` already referenced upload labels that predate this change ("Caption for file 1", "Upload selected files") and were stale before it; they were not rewritten here.
