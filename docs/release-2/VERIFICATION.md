# Release 2 verification ledger

## Current evidence — 2026-09-05

| Evidence | Result | Boundary |
| --- | --- | --- |
| Owner manual testing | Phase 7 changes, account creation, partner linking, sync and other existing flows tested by owner | No invented device list, exhaustive scenario coverage or automation result |
| Current unit suite | 78 tests passed across 12 files during repository assessment | Does not prove browser rendering, deployed policies or true concurrency |
| Phase 7 historical verification | 52 hosted pgTAP assertions; lint, typecheck, 78 unit tests and build reported passing | See [Phase 7 report](../PHASE7_VERIFICATION.md); hosted suite not rerun for this documentation update |
| Gallery | Preserve current changes by owner instruction; owner believes Claude probably fixed the issue | No fresh iPhone or browser confirmation claimed; no active gallery repair |
| Account lifecycle | On hold | Existing leave and empty-delete remain; export/full account deletion are not complete |

The old statement that Phase 7 has no manual signed-in evidence is superseded by owner confirmation. Missing automated specs remain a Release 2 carryover, not a request to repeat manual testing now.

## Checks when the relevant work resumes

- Collection pagination: more than 200 notes/wishes; stable ordering; accurate read state beyond 500 reads.
- Two-account browser regression: account creation, pairing, sync, notes, wishlists and secret-state visibility. Use isolated accounts; preserve private content in traces/logs.
- Clean migration replay and history reconciliation in a disposable environment; use the hosted workflow without requiring Docker/Podman on the owner's machine.
- Concurrent final-slot pairing, conflicting edits, reminder retries and real plan-attachment binary round trips.
- Desktop/mobile, keyboard, reduced motion, screen reader/zoom and performance for affected surfaces.
- Location: OpenStreetMap attribution, search, explicit nearby permission, denied permission, empty results, throttling/outage and manual entry fallback.
- Appropriate lint/types/unit/build, RLS/advisors and browser gates for implementation changes. Documentation-only changes use link, consistency, diff and sensitive-content checks; no deployment or database acceptance is claimed.

Track remaining work by ID in the [backlog](BACKLOG.md). Do not turn an old missing-tool report into a claim that the feature is broken today.
