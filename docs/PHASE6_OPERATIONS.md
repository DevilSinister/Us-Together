# Memory media operations

## Deployment and configuration

Apply Phase 6 migrations, then deploy `supabase/functions/memory-media/index.ts` with `verify_jwt = true`. Include its shared `src/lib/memories/media.ts` dependency. The handler additionally validates the bearer with Auth `getUser` and reads the memory through the caller's RLS client before any elevated work. The built-in Edge environment supplies Supabase URL, anon key, and service-role key. No elevated key belongs in the Next.js environment or browser.

The image processor pins `@imagemagick/magick-wasm@0.0.43`. It reads the exported x86 WASM asset locally when packaged. The connector's deployment bundle omits binary npm assets, so the fallback fetches that exact public package asset from jsDelivr and verifies its SHA-256 against the pinned package before initialization. Only decoder code is fetched; user media never goes to the CDN. A decoder/CDN outage leaves the upload recoverable and unpublished.

Current library/runtime choices were checked against [Supabase image processing](https://supabase.com/docs/guides/functions/examples/image-manipulation), [resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), and [private downloads](https://supabase.com/docs/guides/storage/serving/downloads).

## Supported files and limits

- JPEG/PNG: 5 MiB, at most eight megapixels, neither dimension above 8192. Actual images must decode; previews are oriented, resized to at most 960 pixels on the longest side, stripped of metadata, and encoded as JPEG.
- MP4/WebM: 20 MiB, at most 3840 × 2160 pixels in total and five minutes. The container must include valid dimensions and duration. MP4 must contain media data; WebM must identify its document type and contain a cluster. Truncated containers and unknown-duration streams are rejected.
- Thirty files and 300 MiB per memory. The current release intentionally does not accept WebP/HEIC, animated images, audio-only files, HTML, or SVG. Video originals are played with native controls; video transcoding/poster generation and automatic captions are not claimed.
- Per account: 60 allocations/hour, 120 processing requests/hour, 120 viewer authorizations/minute. Removal is not rate-limited so cleanup remains available.

These controls validate file class and structure; they are not a malware-scanning claim. Originals may retain their original metadata. Preview derivatives strip metadata.

## Upload and recovery

The Edge handler allocates immutable metadata/path values after fresh authorization. The browser uploads directly through authenticated TUS, with six-MiB chunks, bounded retries and visible progress. It never receives a service key. Upload authorization expires after one hour, and Storage requires the exact pending metadata, uploader and active membership. No upsert or browser object deletion is allowed.

Pause/resume works while the page is open. TUS fingerprints and private upload URLs are not persisted to browser storage. After leaving the page, finish a fully uploaded file with **Finish processing**; otherwise remove the unfinished upload and choose the file again. Failed/expired rows remain visible for recovery rather than disappearing.

Finalization claims a five-minute processing lease and token, downloads/inspects the actual object, creates image derivatives, rechecks membership, then publishes only if its lease still matches. Repeated finalization of ready media is safe. Failed processing stores only a generic error code. A worker killed by a runtime limit can be retried after its lease expires.

## Read and delete

Gallery DTOs contain media IDs and display metadata, never object paths or signed URLs. The same-origin media route revalidates identity/RLS, requires ready media, applies a viewer budget, and redirects to a 60-second signed URL with no-store/no-referrer headers. Signing credentials cannot be revoked through Auth rotation; previously issued URLs remain usable until their short expiry. This boundary follows the [Supabase signed URL behavior](https://supabase.com/docs/guides/storage/serving/downloads).

Remove marks the row deleting, deletes both deterministic object paths, then removes metadata. Retry **Remove** after interrupted cleanup. The database blocks metadata deletion while stored objects remain and blocks memory deletion while any media row exists. Account/couple deletion in Phase 8 must follow the same Storage-first order. Expired pending uploads are cleaned through the member UI or an authorized operator; no automatic garbage-collection job is claimed.

## Verification fixtures

`phase6_integration_fixture_setup` creates three isolated fictional Auth accounts and two memories. Passwords are generated at execution time and held only in a revoked private fixture table until cleanup. Export fixture credentials only to ignored local test configuration; never log, commit or include them in traces.

Run `node tests/integration/memory-media-hosted.mjs` with its ignored fixture configuration, then the hosted Playwright spec with `PHASE6_HOSTED=true` and one worker. The browser spec disables traces/video. Its local JPEG/PNG swatch is explicitly fictional; MP4/WebM fixtures come from MDN's CC0 examples.

Apply `phase6_integration_fixture_cleanup` after the tests and any required destructive-cleanup approval. For the current run, automatic approval review requires explicit user permission before deleting the three generated accounts, two fixture couples and temporary table; no cleanup mutation was applied. It refuses to delete accounts until all fixture media has been removed, then deletes only fixture-owned couples/accounts and drops the private fixture table. On a clean replay, setup and cleanup execute without any binary uploads. Do not stop a release replay between those two test migrations.

## Shared memories and moments

The Edge function now accepts a validated memory/moment kind and caption edits. Use moment-media/milestone_media for moments and memory-media/memory_media for memories; never mix paths or parent identifiers. Both entry kinds have the same limits and recovery behavior. The failed current file remains selected with its caption; remove any unfinished allocation before retrying it.

Apply phase6_shared_calendar_moments, phase6_location_budget, phase6_shared_entries_verification and phase6_moment_index_cleanup. Then apply phase6_gallery_photo_comments and phase6_gallery_verification. The entry reminder job is retired; only the independent us-together-plan-reminders job remains active. Historical entry-reminder records are retained but cannot deliver.

Preview reminders are derived on inbox reads and refreshed by a development-only read-only endpoint. Preview files expire after 24 hours and are removed on later access. Real-account media and reminder authorization still require hosted testing. Free location-provider setup and usage limits are documented in SETUP.
