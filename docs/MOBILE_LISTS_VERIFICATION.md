# Mobile navigation and list-first buckets — 2026-09-04

## Behavior

- The phone bar has Home, Calendar, Lists, Memories and More, with readable labels, at least 44px targets, an active destination and left/right/bottom safe-area spacing.
- More opens Plans, Moments, Profile and Partner using the existing modal's keyboard containment, Escape and focus return. Desktop retains the full sidebar.
- Bucket Lists opens with linked list rows and Add list. Each list opens a separate ideas route with Add idea, All lists and list-specific Options.
- Add idea preselects the opened list; idea details link back to their owning list. Filtering and reset remain scoped to the opened list. Rename and empty-list deletion retain the existing server mutations and confirmation.
- The list landing page no longer fetches an all-ideas feed. Route UUIDs are validated and checked against the session-authorized list result. Bucket writes invalidate list pages.
- Existing uncommitted partner-sync, authentication and other UI changes were preserved.

## Evidence

- Graphify queried the existing bucket/navigation graph before cross-file inspection.
- Next.js bundled route and revalidation documentation reviewed.
- Final npm run lint, npm run typecheck, npm run test (53 tests) and npm run build passed; the production route table includes /bucket/lists/[listId].
- Impeccable completed-surface detector: no findings.
- Desktop/mobile list-directory screenshots and 320px navigation/light and More/dark screenshots inspected. The visible development indicator is supplied by Next.js and is absent from production builds.
- Full browser regression: `npx playwright test --timeout=90000` passed 19 tests with 3 expected skips (two credential-gated hosted-media cases and the desktop run of a mobile-only case). Both projects passed all four bucket/navigation journeys.
- Coverage includes two-list isolation, the correct preselected creation list, saved-idea back navigation and reload, filter reset isolation, malformed/missing list 404s, list rename/delete, offline form/filter recovery, conversion to plan/memory, 320px/390px/767px navigation, desktop sidebar, More destinations, keyboard containment/return, dark mode and reduced motion.
- Desktop/mobile idea-page screenshots were also visually inspected. No overflow or blocked controls found in the tested views.
- Secret scan: 231 code/config/document files, zero findings. No logging of list or idea content was added. `git diff --check` passed.
- An initial browser run exposed test assumptions about the old Options entry point and immediate URL changes; those assertions were updated to await the new list route. The final full run is green.
- The user authorized commit and production deployment after validation. The release includes the existing tested partner-refresh integration required by the bucket workspace; deployment outcome is recorded in the task.

## Scope and remaining gates

The user confirmed live list creation, partner verification and syncing work on 2026-09-04. This is user-reported production verification, separate from this change's automated preview journeys.

The installed browser-control skill is unavailable and the in-app browser runtime failed during Windows sandbox startup. Repository Playwright supplies desktop/mobile Chromium coverage; physical iPhone/Android and production deployment checks are not claimed.

No schema, policies, grants, database functions or ownership rules changed. Migration application/reset/list verification and hosted database/security advisors are not applicable to this UI follow-up; earlier clean-replay, overlapping-session and attachment-integration release obligations remain open. No new database acceptance is claimed. See IMPLEMENTATION_PLAN.md and PHASE4_VERIFICATION.md.
