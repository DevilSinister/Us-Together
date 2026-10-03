# Video thumbnail verification - 2026-10-03

The web upload queue, saved-entry media collection and gallery now show an early paused video frame instead of an icon-only tile. Existing files use the authorized original read path, so they need no re-upload or poster backfill. Unsupported or unreadable originals retain an explicit fallback and the open action.

The queued-file URL is created in the effect lifecycle and released on cleanup. This fixes React Strict Mode revoking a memoized URL before a deferred video decode. Thumbnail loading also restores its source after effect replay, cancels its deadline on success, and releases offscreen resources. Frames remain muted and paused.

## Evidence

- PASS: `npm run lint`, `npm run typecheck`, `npm run test` (235 tests, 39 files), `npm run build`.
- PASS: `node node_modules/@playwright/test/cli.js test --config playwright.upload.config.ts` (four desktop/mobile tests). Both memories and moments: queue frame, saved-entry frame, decoded nonuniform pixels at one second, paused/muted state, keyboard viewer opening and Escape, actual gallery navigation, reduced motion, no horizontal overflow, success retained beyond the loading deadline, and unreadable-file fallback with an enabled open action. The existing 30-photo/bad-file continuation tests also pass.
- PASS: desktop/mobile screenshot inspection, using the public CC0 flower-video fixture only. Captures: `.impeccable/qa/video-thumbnails-{memory,moment}-{desktop,mobile}.png`.
- Earlier browser attempts exposed a sign-in/navigation wait race and the Strict Mode queued-URL lifecycle defect; corrected before the final passing run. Browser configuration, environment and generated type settings were restored after testing.
- PASS: changed-source secret/log and whitespace review; no sensitive logging or persistent poster cache added.

## Limits and delivery

This is a scoped web client repair. No API, migration, RLS, Storage policy or Edge function changes are required. Migration reset/application/list, Supabase advisors and authorization/RLS suites were not rerun for this repair; the preceding photo-batch repair has separate evidence. Full browser suite, authenticated hosted video-browser checks, native Android/device checks, Safari/codec matrix, large-gallery stress and Graphify refresh were not run. In-app browser verification remains blocked by the recorded Windows sandbox startup failure and unavailable required browser skill; Playwright evidence is separate.

The original verification ran on the combined repair branch before the thumbnail-only PR split. The focused `codex/video-thumbnails` branch contains the same thumbnail code, browser tests and related documentation. Browser-supported video codecs can produce frames; unsupported codecs keep the fallback. PR #10 merged the thumbnail fix into `main` on 2026-10-03. Hosted web publication was not rechecked during this conflict resolution.
