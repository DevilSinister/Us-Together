# Phase 6 gallery follow-up

The owner clarified that memories/moments should not have reminders, requested six small photo previews per entry, a full photo/video gallery, a Home gallery grouped by entry or date, and captions/comments on each file.

## Implemented behavior

- Memories and Moments listings and detail pages show the first six uploaded images. Show more navigates to /gallery scoped by entry UUID and kind, with every photo/video. Listing previews load near the viewport; thumbnails open the shared viewer directly.
- Home → Open gallery opens /gallery. Group by memory/moment or original story date; filter source, photo/video and date. Production loads 48 files per page using date/kind-UUID cursors.
- One viewer displays the file, caption, entry link and per-file conversation. Both active partners can comment; only the author deletes their comment. Caption editing and Storage-first file removal stay available.
- Story-level comments remain separately available. Preview files and file comments persist in session/entry/file-scoped IndexedDB; preview is local and does not simulate another partner.
- Entry reminders are removed from UI/actions/preview delivery. Client access to historical reminder rows/RPC is revoked; entry cron is removed and its worker is inert. Plan reminders retain their table, permissions and independent active cron.
- Existing coordinate removal, free location lookup and shared calendar remain in place.

## Evidence

- Hosted gallery/comment integration: 43 checks passed, including two real private photo uploads, partner caption/comment access, foreign denial and cleanup of this run's files and moment.
- Current entry and gallery pgTAP suites: 53 assertions passed in rollback-only hosted verification. Tests cover ready-only gallery, both parent kinds, forged authors, two-file comments, empty/oversize comments, author-only deletion, foreign/former/anonymous denial, 500-comment quota, comment cascade, retired entry reminder access and retained plan reminder job/grants.
- Unit tests: 49 passed in nine files, including validated gallery entry scope.
- Generated database types and route types updated.
- Final lint, standalone typecheck and production build passed; /gallery is present and the retired preview-reminder route is absent.
- Desktop/mobile suite: 13 passed and 3 expected skips; two existing multi-page pairing tests exceeded their default 30-second limit during concurrent compilation. Their focused rerun passed (both completed within 26 seconds with a 60-second budget), giving 15 passing applicable journeys overall. New gallery journeys both passed.
- Separate hosted TUS browser gate: 2 passed, covering private photo/video upload, viewing, playback, download and removal.
- Final secret scan: 220 code/config/document files, zero findings. git diff --check passed.
- Impeccable review fixes applied: compact mobile filters, sticky viewer close/count header, textarea disabled during comment posting. Desktop/mobile screenshots confirm the final layout. In-app runtime remained unavailable, so repository browser tests supplied screenshots.
- Graph updated to 1,369 nodes and 2,604 edges, with no missing endpoints. Nine grounded gallery semantic nodes added; old reminder concepts marked historical/retired. HTML export succeeded after retrying its initial file-write error.

## Migration correspondence

| Local file version | Hosted version | Name |
| --- | --- | --- |
| 20260902174600 | 20260902171142 | phase6_gallery_photo_comments |
| 20260902174700 | 20260902172709 | phase6_gallery_verification |

The files were created with the CLI and ordered after the repository's existing future-stamped extension verification. Hosted migration listing has 27 entries after this follow-up. Verification uses fictional data in rolled-back subtransactions and asserts fixture rollback.

Database advisors report no new warning/error and no performance warning/error. The pre-existing Auth leaked-password protection warning remains; see [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Intentional no-policy private/invitation relations remain informational.

The existing disposable Auth-account cleanup approval blocker and ADR-014 final integration obligations are unchanged. No previously blocked account/couple deletion was retried. No clean-from-zero local replay is claimed; Docker is unavailable. In-app browser control failed to initialize because its Windows sandbox helper failed; browser verification uses the repository Playwright runner.

## Listing navigation and Linux install correction

Desktop and mobile gallery journeys pass with seven photos per entry and an additional video. They verify six listing previews, scoped Gallery links, no six-file cap in Gallery, real Chromium touch swipes on mobile, keyboard navigation, reduced-motion rendering, per-file caption/comment persistence and no horizontal overflow. Impeccable finish review found no material issues.

Removed the required Windows-only Supabase CLI dependency; the pinned cross-platform supabase package selects optional platform binaries. Linux npm ci dry-run succeeds. CI uses Node 22 and typecheck generates Next route types for a fresh checkout. Browser media fixtures are committed under tests/fixtures for reproducibility. No schema or RLS changes were needed for this correction.
