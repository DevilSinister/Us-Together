# Drawing notes and Android widget verification — updated 2026-09-17

Status: web and Android source implemented; both drawing migrations applied to the confirmed hosted Us-Together project. Release is still open because the hosted web app does not serve the drawing routes, Firebase push is unconfigured, and no real paired-account or device round trip has run.

## Source and behavior

The drawing editor uses a 640×480 fixed white card with pencil, marker, highlighter, paint bucket, filled rectangle and ellipse, eyedropper, eraser, swatches/custom color, undo/redo, local draft and review-confirmed send. Text notes retain their existing edit/private behavior. The upload route re-encodes PNG input, derives couple/author/recipient from the server session, and publishes only after private Storage upload. The recipient widget reads only received ready rows through RLS. FCM payload is only `type=drawing`.

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

The owner supplied an HTTPS Vercel origin. It answered HTTP 200 for sign-in, while `/drawings` and `/drawings/new` answered HTTP 404: the current web deployment has not picked up this source. A clean Android debug assembly used that origin and the existing public Supabase URL/publishable key. Generated BuildConfig readback confirmed the intended web origin, Supabase host and deliberately empty Firebase app ID without printing the key. The APK is installable for private testing, but tap-through to a drawing will fail until the web code is deployed. No device or emulator was connected or configured on this machine.

Supabase handles independent auth, private data and image reads. Without Firebase credentials, Android cannot receive an OS background push from Supabase Realtime alone. This package shows push as unavailable and refreshes on app open, reconnection, manual request and a 15-minute periodic Android job; Android may defer the job. The seconds-level update target is therefore unmet in this Firebase-free build.

## Open gates before release

- Run the negative RLS suite `0010_drawing_notes_rls.test.sql` in a resettable writable test database, plus a real Storage binary round trip. These are not inferred from policy readback.
- Test with two real linked accounts: send, recipient read, author history, former/foreign denial and immutable ready row. Run the negative SQL suite in a resettable non-production database.
- Deploy the new web routes to the owner-supplied Vercel app, then verify `/drawings` is reachable after sign-in. Install the configured private APK on a device and check sign-in, no-note state, offline cached note, resizing, tap-through and sign-out. Firebase config is absent, so push delay/duplication and token rotation remain future acceptance gates if prompt background updates are required.
- Direct in-app browser and real-device visual/keyboard/reduced-motion checks remain open. The temporary Chromium harness covers editor controls and mocked send failure, but not an authenticated send or Android home screen.
- Refresh Graphify after resolving the pre-existing untracked `graphify-out/` work; the graph was queried first but left untouched to preserve owner files.

Deploy sequence: hosted migration is complete; RLS and binary evidence precede web deployment, then installed private APK and device acceptance. Firebase setup is required for prompt background updates.
