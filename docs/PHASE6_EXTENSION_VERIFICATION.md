# Phase 6 extension verification — 2026-09-02

Historical evidence for the initial extension. ADR-021 removes entry reminders and adds per-file galleries/comments; see PHASE6_GALLERY_VERIFICATION.md for current behavior and checks.

The user requested removal of manual coordinates, visible multi-photo uploads in preview, captions/comments on memories and moments, personal reminder notifications, a Calendar page linked from Home, and location lookup. They subsequently declined paid Google Places and requested a free alternative.

## Implemented and exercised

- Calendar: Home, desktop and mobile access; plans, memories and moments; month/week views, source filters, keyboard day selection, linked agendas and independent bounded cursors.
- Entries: multiple files selected during memory/moment creation, sequential upload after story save, individual captions and caption edits, shared comments, author-only comment deletion, detail viewer and recovery controls. Moment detail is /milestones/[id].
- Preview: real images/videos and comments in IndexedDB scoped to session and entry; caption/comment persistence after reload and preview gallery covers. Files expire after 24 hours and are removed on later access. Nothing is sent to the shared account.
- Reminders: personal database reminders and generic in-app notifications; a private cron worker honors membership and preferences, retries failures and prevents duplicate delivery. Preview notifications are computed from due reminders without background cookie writes; Home/Notifications poll a development-only read-only endpoint.
- Locations: free Photon/OpenStreetMap search and permission-based nearby lookup, no key or billing account. Input is debounced, requests are bounded, responses validated, errors recoverable and attribution visible. No manual coordinate fields; coordinates are not persisted by lookup. Legacy database columns remain for compatibility.

## Current results

| Gate | Result |
| --- | --- |
| npm run lint | Pass on final source |
| npm run typecheck | Pass |
| npm run test | 49 tests pass across 9 files |
| npm run build | Pass on final source; Calendar, moment detail and preview reminder routes included |
| Full desktop/mobile browser regression | 15 pass; 3 expected skips (mobile-only test's desktop copy, and 2 separately executed signed-in tests) |
| Signed-in TUS browser workflow | 2 pass: desktop/mobile photo upload/view/download, video playback and removal |
| Shared preview journey | Both desktop/mobile pass multiple memory/moment photos, captions, comments, reload persistence, Calendar filters/keyboard navigation and ten-second reminder inbox delivery |
| Free location provider | Live search and browser geolocation passed on desktop/mobile without an API key |
| New hosted authorization suite | 36 pgTAP assertions pass in a rolled-back verification migration |
| Actual hosted moment integration | 26 checks pass, including two private photos, partner captions/comments, foreign denial, personal reminder isolation and removal |
| Security advisor | No new table/policy warning; pre-existing Auth leaked-password setting warning and intentional RLS-without-policy information remain |
| Performance advisor | Duplicate moment creator index fixed; no WARN/ERROR remains; INFO unused-index observations retained |
| Secret scan / diff | 212 source/doc files scanned with no credentials found; git diff --check passes |
| Visual verification | Desktop memory detail and mobile Calendar/location forms inspected; consistent journal styling and no horizontal overflow. Finish review fixes duplicate photo headings/rules. |
| Graphify | 1,327 nodes / 2,517 edges / 105 communities; 14 extension semantic nodes; zero missing endpoints or obsolete uploader nodes. |

New database checks cover comment identity forgery, foreign/two-parent denial, author-only deletion, private reminder recipients, replacement, invalid times, forged worker state, worker privilege denial, verified/unverified moment storage access, generic delivery, idempotence, preferences, former members and anonymous callers. All fictional pgTAP data rolls back before commit. The actual moment integration removed its temporary moment, comments and files. Existing generated Auth accounts were retained as previously required by automatic approval review.

The deployed memory-media Edge function is version 8 with JWT verification enabled. Existing binary signature/container and image-decoder logic is preserved; the shared entry kind selects the correct parent, metadata table and private bucket.

## Applied extension migrations

| Name | Local filename timestamp | Hosted version |
| --- | --- | --- |
| phase6_shared_calendar_moments | 20260902154654 | 20260902155012 |
| phase6_location_budget | 20260902171000 | 20260902161309 |
| phase6_shared_entries_verification | 20260902173500 | 20260902163250 |
| phase6_moment_index_cleanup | 20260902174500 | 20260902164035 |

The hosted migration list now contains 25 entries. Generated TypeScript database types include the new tables/RPCs. Match migration names and reviewed SQL when connector-assigned timestamps differ.

## Remaining phase-closeout obligations

These feature changes do not waive ADR-014: clean-from-zero replay, real concurrent database-session timing and final two-person pairing remain the agreed integration obligations. Docker is unavailable, so no local reset was claimed. The prior guarded deletion of three generated Auth fixture accounts/two couples remains unapplied: automatic approval review requires explicit approval for that permanent cleanup. No retry or workaround was used.

The existing Auth warning concerns [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Policy-free invitation/fixture tables intentionally deny access; see [RLS advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Photon's public server permits reasonable project use, can throttle, and does not guarantee availability. See [service policy](https://github.com/komoot/photon#demo-server) and [API documentation](https://github.com/komoot/photon/blob/master/docs/api-v1.md). The provider endpoint and kill switch are configurable. Notifications currently mean the in-app inbox; push/email/SMS remain outside this implementation.
