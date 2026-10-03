# Batch video upload recovery â€” 2026-10-03

## Finding and repair

The old shared memory/moment uploader captured a token once per file, retried for only nine seconds, and presented every terminal TUS error as a connection problem while leaving its transfer promise pending. Resume reused the captured token. Permanent failures could therefore block the remaining batch indefinitely.

The uploader now reads the current session before every TUS request, refreshes credentials near expiry and after an HTTP 401, and retries temporary failures with 0/3/5/10/20-second delays. Network, timeout, conflict, lock, throttling and server failures remain resumable. Connection-return and foreground events resume connection pauses; a deliberate user pause stays paused. Authorization, size and other permanent rejections settle the file as failed so the batch continues and preserves its caption/allocation for retry. Messages include only safe HTTP status/category information, never raw TUS errors containing private URLs.

The direct Storage hostname, 6 MiB chunks, sequential queue, authorized allocation, immutable originals, non-persistent upload fingerprints and existing 24-hour upload lease remain unchanged. No schema, Edge Function or APK change is required. Closing the page does not persist the selected file or upload URL.

## Evidence

- PASS: a fictional 13 MiB valid MP4 with a legal `free` padding box uploaded through the hosted direct Storage endpoint: POST 201 plus two PATCH 204 responses; finalization published it, then diagnostic binary/metadata cleanup succeeded.
- PASS: real TUS transport against a fault-injected HTTP server recovers an expired token, HTTP 429, and a PATCH whose bytes were accepted but response was lost. HEAD resumes from the 12 MiB offset, one upload creation, identical final bytes.
- PASS: credential changes after pause, near-expiry refresh, missing session handling and safe failure categorization.
- PASS: 249 tests across 41 files.
- PASS: explicit hosted desktop and Pixel 7 Chromium checks upload two 13 MiB videos, force an offline PATCH, resume both automatically on reconnection, preserve a manual pause across an online event, resume by keyboard, reject one upload with HTTP 403 and publish the next. All test-created rows/binaries are removed; guarded cleanup also removed one prior-attempt diagnostic and confirmed zero matching leftovers.
- PASS: desktop/mobile reduced-motion, no horizontal overflow, screenshots inspected; lint, typecheck and production build.
- PASS: temporary SDK token-refresh outages remain recoverable connection failures rather than forced sign-outs.
- Earlier browser attempts failed on outdated selectors and a global fixture sign-out that interfered with another client. Final tests use current accessible labels and local-scope session cleanup. An isolated desktop rerun and the final mobile run passed.
- NOT RUN: migration reset/application/list, database advisors and negative RLS suite (no schema/policy/server changes); Android build, physical TWA/device, background/Doze, broader browser and screen-reader checks. Existing local database replay remains machine-blocked. Graphify was queried first; graph refresh was not run for this scoped client repair. The required in-app-browser skill is unavailable; standalone Playwright supplied browser evidence.
- Source credential/log/whitespace review is completed at delivery. No raw transfer logs are added to application code. Production acceptance is separate from these local/hosted-fixture results.

Available hosted Storage logs did not contain a failed resumable transfer matching the user report. These repairs address demonstrated client recovery defects; they do not establish the exact historical cause on the owner's device. The new safe rejection category/status makes a recurrence actionable.

Official reference: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads). Current changelog and installed tus-js-client 4.3.1 request/retry APIs were reviewed.
