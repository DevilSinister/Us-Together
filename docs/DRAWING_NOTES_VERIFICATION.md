# Drawing notes and Android widget verification — updated 2026-09-17

Status: drawing web source is deployed and live between two fictional paired accounts; both hosted drawing migrations are applied. The Android debug APK is built for the live HTTPS origin. Physical Android acceptance remains with the owner, and Firebase-free refresh cannot meet the seconds-level background target.

## Source and behavior

The drawing editor uses a 640×480 fixed white card with pencil, marker, highlighter, paint bucket, filled rectangle and ellipse, eyedropper, eraser, preset swatches and a stroke-size slider, undo/redo, local draft and review-confirmed send. Text notes retain their existing edit/private behavior. The upload route re-encodes PNG input, derives couple/author/recipient from the server session, and publishes only after private Storage upload. The recipient widget reads only received ready rows through RLS. FCM payload is only `type=drawing`.

## Completed gates

| Gate | Result |
| --- | --- |
| `npm run lint` | Passed with no findings after final keyboard-cursor change |
| `npm run typecheck` | Passed |
| `npm run test` | 93 tests in 15 files passed, including flood-fill boundary |
| `npm run build` | Passed after externalizing ImageScript and clearing the temporary harness type cache; final production route list contains drawings and no harness route |
| Android `gradlew.bat :app:assembleDebug` | Passed using JDK 17; debug APK generated locally, without deployment config |
| Isolated editor Chromium harness | Desktop and mobile passed pencil stroke, undo/redo, bucket, keyboard, review and no horizontal overflow. A second pass exercised marker, eraser, highlighter, eyedropper, rectangle, ellipse and bucket pixels on both devices. It found that review unmounted the canvas and Send returned silently. After the fix, a focused desktop/mobile pass (2/2) confirmed the failed-send alert and exact draft restoration. Temporary harness files were removed. |
| Full existing Playwright suite | 11 passed, 8 failed, 3 skipped across desktop/mobile. Failures: navigation link count 13 vs expected 8, memories back-link missing, paired-plan text missing, gallery caption control missing. These are in existing flows; no baseline rerun isolated causality. |
| Secret scan | New source and environment examples contain no real credential values or drawing content logging. Server key names and a placeholder PEM marker are code/config references only. |

## Hosted database application — 2026-09-17

- Confirmed the exact repository project reference resolves to the active **Us-Together** project before writing. The connector project list showed another project, so it was not used as the target.
- Applied `20260917013807_drawing_notes.sql`, then `20260917014059_drawing_notes_author_index.sql` to resolve the new author foreign-key index advisor finding. The local filenames match the hosted migration ledger versions. Readback found both tables, a private `drawing-notes` bucket, eight table policies, three Storage policies, authenticated grants, RLS enabled and the author index.
- Security advisors report no drawing-specific finding. Remaining findings predate this feature: three RLS-enabled tables without policies, `pg_net` in `public`, and disabled leaked-password protection. Performance advisors report no missing drawing index; new indexes are marked unused because the feature has no observed traffic yet. Other findings remain outside this release item.
- The hosted SQL connector runs read-only transactions. Attempting the transactional pgTAP fixture suite returned `25006 cannot execute CREATE EXTENSION in a read-only transaction` before any fixture write. No fixture data was added. Local reset is still blocked by missing Docker/Podman. An anonymous Data API request for drawing-note IDs returned HTTP 401. Automatic approval review rejected a separate anonymous device-token endpoint probe because the request named the sensitive token column, even though only its status would have been printed. That probe was not retried; grants and policy metadata were checked read-only instead.

## Configured APK and hosted web — 2026-09-17

The owner supplied an HTTPS Vercel origin. Before the GitHub push it answered 404 for drawing routes. Feature commit `b60d220` was pushed to `main`; afterwards `/drawings` and `/drawings/new` redirected unauthenticated visitors to sign-in and the new push-status route answered 200. A clean Android debug assembly used that origin and the existing public Supabase URL/publishable key. Generated BuildConfig readback confirmed the intended web origin, Supabase host and deliberately empty Firebase app ID without printing the key. No device or emulator was connected or configured on this machine.

Supabase handles independent auth, private data and image reads. Without Firebase credentials, Android cannot receive an OS background push from Supabase Realtime alone. This package shows push as unavailable and refreshes on app open, reconnection, manual request and a 15-minute periodic Android job; Android may defer the job. The seconds-level update target is therefore unmet in this Firebase-free build.

## Live paired-account and visual acceptance — 2026-09-17

Two synthetic, auto-confirmed accounts completed the real web onboarding, joined the same couple through a six-digit invitation, and remain paired for owner testing. One account drew and sent a PNG through the deployed editor. The author reached its immutable detail page; the recipient's history rendered the 640×480 image and linked to that detail. An anonymous image request returned 404. The Android-style direct REST query with the recipient's own session returned the newest received ready row, and its private Storage download returned HTTP 200 `image/png` (3,189 bytes). An author update attempt returned zero affected rows; deletion returned zero rows; the ready row and send timestamp remained intact.

Desktop and 390 px mobile Chromium screenshots were inspected. The recipient card and navigation rendered correctly, the PNG loaded, and the mobile document had no horizontal overflow. This verifies the web surface, not the native widget. The synthetic test credentials are kept in a local temporary file outside the repository and vault; no test credentials or drawing content were committed.

## Open gates before release

- Run the negative RLS suite `0010_drawing_notes_rls.test.sql` in a resettable writable test database, plus a real Storage binary round trip. These are not inferred from policy readback.
- The two-account send/read/immutable path passed. Former-member and foreign-couple denial still require a resettable non-production database or additional isolated fixtures. Run the negative SQL suite there.
- Install the configured private APK on a device and check sign-in, no-note state, offline cached note, resizing, tap-through and sign-out. Firebase config is absent, so push delay/duplication and token rotation remain future acceptance gates if prompt background updates are required.
- Direct in-app browser and physical-device keyboard/reduced-motion checks remain open. Desktop/mobile Chromium now covers the authenticated send and recipient render; it does not verify an Android home screen.
- Refresh Graphify after resolving the pre-existing untracked `graphify-out/` work; the graph was queried first but left untouched to preserve owner files.

Deploy sequence: hosted migration and web deployment are complete. Owner installation and native widget acceptance remain; Firebase setup is required for prompt background updates. The transactional negative RLS suite remains a separate test-environment gate.

## Drawing workspace UI revision — 2026-09-17

The owner requested a distinct Drawings destination and NoteIt-inspired canvas-first presentation. Notes no longer links into the drawing flow. The editor presents eight named icon tools, eleven preset swatches, no custom color input, and a size slider for pencil, marker, highlighter and eraser. The history and detail retain authorized image routes and newest-first metadata. This revision adds no migration, API or Android change.

After the UI change, lint, typecheck, all 93 unit tests and production build passed. Authenticated desktop Chromium (1440 px) and Pixel 7 emulation exercised highlighter selection, slider value 8, icon tool count, preset swatch count, absence of a custom color input, review/back transition and no horizontal overflow. Full-page screenshots were inspected for both layouts. Reduced motion was enabled in both runs. The Impeccable detector reported no findings. The existing full Playwright suite was not rerun for this visual-only revision; its last result remains 11 passed, 8 failed, 3 skipped. Migration reset, negative SQL RLS and database advisors were not rerun because schema did not change. Android device and Firebase background-push gates remain open as above.

Deployment readback: commit `47f3838` was pushed to GitHub `main`. The hosted authenticated `/drawings/new` page displayed the size slider and all eleven preset swatches after deployment. The unauthenticated route redirected to sign-in.
