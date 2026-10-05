# Compact typography and Moments — 2026-10-05

Owner-directed Impeccable refinement replaces competing app heading sizes with three reusable roles in `src/app/globals.css`: page titles 30/36px, section titles 22/24px, and semibold sans-serif entry titles 18px. Shared page introductions and Notes excerpts use 16px text. App pages, authentication headings, details, forms, dialogs, and entry lists use these roles. Existing serif/sans families and theme colors remain authoritative; public marketing display text, pairing codes, and avatar initials retain their separate roles.

Moments now uses compact rows with a horizontal six-photo strip. Titles open the moment and thumbnails open the viewer. View all N files appears only when additional files exist beyond the preview; detail media uses Open gallery. The source, media access, and authorization contracts do not change.

## Verification

- Passed: lint, typecheck, 249 unit tests in 41 files, production build, diff whitespace review, and added-source sensitive/log pattern scan (zero hits). Generated Next references were restored after browser verification.
- Passed: desktop and Pixel 7 Chromium populated Moments checks, including one/seven-photo cases, six-preview limit, keyboard viewer opening, scoped gallery access to all seven files, and correct conditional link visibility.
- Passed: computed 30/36px page-heading checks on Home, Calendar, Notes, Wishlists, and Lists; no document overflow; reduced motion; an additional 320px dark Moments capture. Screenshots inspected for Moments, Home, Calendar, Notes and Lists. Notes preview exposes the pairing notice, so populated Notes was source-reviewed rather than rendered.
- Passed: the existing focused Gallery filters check on desktop and mobile after the role migration.
- Impeccable type detector: new roles documented; only the existing 10px initial inside the smallest avatar remains an advisory. It is not a body or label size and was not changed.
- Initial Moments browser assertions used the retired Media viewer dialog name. Actual rendered state was the working Photo viewer; corrected selector passed on both projects.
- Not run: full browser suite, hosted account/media acceptance, human screen-reader/200% zoom audit, physical Android/device checks, migration reset/application/list, negative RLS suite, database/security advisors, Graphify refresh, or deployment. This is a web typography and preview-layout change. Graphify was queried before cross-file changes. Required in-app controller was unavailable; Playwright supplied browser evidence.

Source and documentation remain uncommitted. No publishing or production-data changes were performed.
