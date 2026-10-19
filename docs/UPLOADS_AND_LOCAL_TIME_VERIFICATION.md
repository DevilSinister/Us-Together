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
- `tests/e2e/memory-media-hosted.spec.ts` was rewritten (see below) and typechecks, but was **not run**: it writes to the hosted project and needs the owner's go-ahead.

## Follow-up: the two stale media specs — 2026-10-19

`tests/e2e/shared-calendar-media.spec.ts` and `memory-media-hosted.spec.ts` still used labels that predate this change ("Choose photos or videos", "Caption for file 1", "Upload selected files") and the old viewer ("Caption and file options", "Post comment", "Swipe photo"). Both were rewritten for the current interface with their original intent kept:

- **Preview spec.** Seven photos are chosen as tiles with nothing to fill in, and they send on save, leaving no `data-upload-state` tiles and no Pause control. The caption is then added in the viewer's three-dot menu ("Add a caption") and later edited there. The detail page shows six previews, and the moment list card shows six and steps to "2 of 7", by swipe on Pixel 7 and by arrow key on desktop. A per-file comment is posted in the comments sheet, is absent on the neighbouring photo, and survives a reload. A video added to the saved moment sends on choice. Calendar links, Home gallery counts (15) and the From/Show/date filters, a comment from Home reaching the same file, and no horizontal overflow are also covered.
- **Hosted spec.** The swatch sends on choice and its caption is added in the viewer. Download comes from the menu (307, `no-store`, token). The video plays and an arrow key on the focused video does not change file. Both files are deleted from the viewer menu, the download link then returns 404, and a `finally` block removes any of this run's rows by creation time, the way `video-upload-recovery.spec.ts` does.

Three interface facts changed the spec beyond the labels:
- The memories list has had no photo previews since `15bcf4e`, so the six-preview card check runs on the moments list only. The memory reaches its gallery from the detail page.
- The scoped gallery orders files differently from the entry, so captioned files are found by their caption rather than as "photo 1".
- Comment and caption sheets are closed with their own Close button. In Playwright Chromium, a third sheet-closing Escape in one viewer session, after ArrowRight and a click, closed the whole viewer instead of the sheet. This was then confirmed and fixed (ADR-049; see below).

| Gate | Result |
| --- | --- |
| Playwright `shared-calendar-media.spec.ts`, desktop Chromium + Pixel 7 | PASS 2/2 (32.7s, 23.0s) on the fifth run. Runs 1–4 failed on the spec, not the product: the memories card that no longer exists, then the gallery's file order, then the Escape behaviour above. It ran against a `next dev` already running on port 3100, because Next 16 refuses a second dev server in the same folder. The run used a temporary config with the installed Chromium 1243 path, which was deleted afterwards. `.env.local` was backed up, set to `DEV_LOGIN_ENABLED=true` for the run, and restored byte-for-byte. |
| `memory-media-hosted.spec.ts` | Typechecks and lints; **not run** (hosted writes need owner approval) |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |

## Follow-up: Escape closing the whole photo viewer — 2026-10-19

**Confirmed.** A probe logged every `cancel` event on the viewer's `<dialog>`. In one viewer session the first two Escapes arrived `cancelable=true` and were prevented to close the sheet. The third arrived `cancelable=false`, and the browser closed the whole viewer. That held for clicks between every Escape, for arrow-then-click, and for the shared spec's exact sequence. Two Escapes with nothing between them behaved, because the second is meant to close the viewer. The probe also showed a second defect: after the native close, React still held the viewer open, so the next Comments or Open photo did nothing.

**Fix (ADR-049).**
- `media-viewer.tsx` handles Escape in `keydown`, ignoring IME composition. It closes the menu, then the sheet, then the viewer. `cancel` is kept for other close requests, and a `close` listener clears the selection when the browser closes the dialog itself.
- `ui/dialog.tsx` (`DialogContent`) gets the same keydown handling. It honours `dismissible` and stops the event from reaching a parent dialog. It also gets the same `close` sync.

Not reproduced by hand on a physical keyboard or Android back gesture. The probe used Playwright's trusted CDP input in Chromium 1243.

| Gate | Result |
| --- | --- |
| New `tests/e2e/viewer-escape.spec.ts` | PASS on desktop Chromium and Pixel 7. It covers four sheet-closing Escapes, with an arrow key in between, keeping the viewer open. Menu then viewer close in order. The viewer and the filter dialog reopen after a native `close()`. The filter dialog survives four Escapes. The pre-fix probe failed this same sequence on the third Escape. |
| Regression: `gallery-filters`, `compact-moments`, `shared-calendar-media`, `video-thumbnails` | PASS, desktop + Pixel 7 (10/10 with the new spec, one run against the `next dev` already on port 3100). A temporary Chromium-1243 config and the probe files were deleted. `.env.local` was flipped for the run and restored byte-for-byte. |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test` | PASS, 261 tests in 43 files |
| `git diff --check` | PASS |
| `npm run build` | **Not run.** `next.config` has no `distDir` escape hatch, and building would write production manifests into the `.next` that another session's running `next dev` (port 3100) serves from, a recorded trap that breaks that server. Run it when no dev server is up. |
| Other suites using `DialogContent` (bucket, profile avatar, app navigation) | Not run individually; covered only by lint/types and the shared gallery-filters case. |
