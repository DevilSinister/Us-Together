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

## Android offline direction and current gate — 2026-09-17

The owner expanded scope to every product feature in one offline-capable APK, with sync on reconnection. The existing Android module remains a widget companion. This change routes widget taps to a native cached drawing screen, adds a Home-to-drawing path, and removes the web-origin requirement from Android sign-in. The web drawing editor adds airbrush and differentiates pencil, marker and highlighter. The configured debug APK was assembled using existing public Supabase build values, with no web origin or Firebase values supplied. It has not been installed on a device. Android drawing creation, all other native feature areas, offline mutation queues and reconnection sync are not implemented. See [Android offline migration](ANDROID_OFFLINE_MIGRATION.md).

Final source gates for this change: lint passed; typecheck passed after fixing an airbrush coordinate error; 93 unit tests passed; Next production build passed; Impeccable detector returned no findings; Android Gradle debug assembly passed. Desktop/mobile editor interaction and native device tests were not run. No schema/migration or Supabase advisor gate ran because this change made no schema or policy edits. The negative SQL RLS suite remains open. This gate record does not turn the current APK into a standalone product.

## Native drawing editor source — 2026-09-17

After the Android-only direction, the app gained a native 640×480 editor with nine tools, local draft, undo/redo, review, a per-account offline PNG queue and retry of the same immutable drawing ID after connectivity returns. Widget taps continue to open the native cached image viewer. Android `assembleDebug` and `lintDebug` passed after fixing gesture-back handling, API-26 encoding and UI-thread PNG work. `testDebugUnitTest` reported NO-SOURCE: there are no Android unit tests yet. No physical device, emulator, or paired native send/read test ran, so offline queue correctness and visual behavior are unverified. The web feature gates from the earlier revision remain historical evidence, not proof of the native flow. The rest of the product has not been ported.

## Note it polish, one-APK shell and database FCM — 2026-09-20/21

Owner decisions: polish drawings and text notes; Android as one release-signed APK (web app in a Trusted Web Activity + native widget, outbox and FCM, ADR-032); owner creates the Firebase project. Package renamed `app.ustogether`. See ADR-032/033, `docs/API_CONTRACTS.md`, `docs/DATABASE.md`, `docs/PHASE8_OPERATIONS.md`, `android-widget/README.md`.

Defect found and fixed: `note_reads` was written with an upsert that needed an UPDATE grant the table never had, so every read mark failed with 42501 silently and the notes "New" pill never cleared. Both `note_reads` and the new `drawing_reads` are now insert-only writes.

| Gate | Final result |
| --- | --- |
| `npm run typecheck` | Passed (exit 0) after deleting stale `.next/dev/types` files that still named the removed push-status route |
| `npm run lint` | Passed (exit 0) after moving a ref read out of render in `note-form.tsx` |
| `npm run test` | Passed: 126 tests in 22 files (exit 0); new suites for cursors, relative time, notes/drawings loaders, assetlinks, manifest |
| `npm run build` | Passed (exit 0); route list includes `/drawings`, `/drawings/[id]`, `/drawings/new`, `/notes/*`, `/api/drawing-notes`, `/api/drawing-notes/[id]/image`; no push-status route |
| Android `assembleDebug lintDebug testDebugUnitTest` (JDK 17, Gradle 8.14) | Passed (`BUILD SUCCESSFUL`, `GRADLE_EXIT=0`) on the second run; first run failed lint with 3 errors (`AppLinkUrlError` on the placeholder host, `UseAppTint` ×2), fixed with a `tools:ignore` and by dropping redundant tints. Lint 0 errors / 32 warnings. JUnit: `PushEnvelopeTest` 4/4, `PendingDrawingsSyncTest` 2/2. Debug APK written; built without `WIDGET_*` values, so it proves compilation only |
| Hosted migrations `20260920195724`, `20260920195802` | **Not applied.** Owner approval required; apply in that order, then advisors, then regenerate types |
| `fcm-dispatch` deploy, Edge secrets, Vault `fcm_endpoint_url` | **Not done.** Owner-gated; depends on the Firebase service account |
| pgTAP `0012_drawing_reads_rls`, `0013_fcm_deliveries` | **Not run.** No Docker/Podman; hosted SQL connector cannot run fixture transactions |
| Playwright `tests/e2e/notes-drawings.spec.ts` | **Not run.** Browsers absent on this machine; preview-lane journeys written, two-account lane marked fixme |
| In-app browser lanes (preview editor, two-account read pills, Home card, 390 px fit) | **Not run this session.** Owed |
| Impeccable detector on drawings/notes surfaces | **Not run this session.** Surface contracts added under `.impeccable/surfaces/` |
| Trusted Web Activity verification, FCM end-to-end, widget rendering, Doze, offline, sign-out clears token | **Owner device gates.** Release keystore and `assetlinks.json` fingerprints still empty |
| Secret scan | New files carry no credentials; `.env.example` lists variable names only; Firebase service account is documented as an Edge secret only |

Rollout order still to run: owner Firebase + keystore → apply migrations with advisors → deploy `fcm-dispatch` + secrets + Vault → fill `assetlinks.json` and push web → `assembleRelease` → install on both phones → device script in `android-widget/README.md` and the plan.

### Hosted application — 2026-09-21

- Target confirmed by name (**Us-Together**, `ACTIVE_HEALTHY`) from the repository's `NEXT_PUBLIC_SUPABASE_URL`; the connector's project listing was not used. Pre-apply readback showed neither table, no Vault secrets, and the live defect: `has_table_privilege('authenticated','note_reads','UPDATE') = false` with zero `note_reads` rows.
- Applied `drawing_reads_and_note_paging` then `fcm_deliveries`; the hosted ledger stamped `20260920195724` and `20260920195802` and the local filenames were renamed to match.
- Security advisor: one new INFO, `fcm_deliveries` has RLS enabled with no policy, which is the same deliberate worker-bookkeeping shape as `push_deliveries`; pre-existing findings (`pg_net` in `public`, leaked-password protection, two other RLS-no-policy tables) unchanged. Performance advisor: only unused-index notices on the new tables, expected with no traffic; the pre-existing duplicate `memories` index is unchanged.
- Readback: `drawing_reads` 3 policies, INSERT granted, UPDATE not granted; `fcm_deliveries` no SELECT for `authenticated`; `settle_fcm_deliveries` executable by `service_role` only (not `anon`, not `authenticated`); `notifications_enqueue_fcm` trigger present; `notes_couple_updated_idx` present; cron `us-together-fcm-dispatch` active every minute. The connector's role cannot execute `private.dispatch_due_fcm`, which is the intended revoke.
- PostgREST cache: anonymous `GET /rest/v1/drawing_reads?select=drawing_id&limit=1` returned 401 (fresh schema), not 400.
- `fcm-dispatch` deployed as version 1 with `verify_jwt = false`; POST without the header returned 404, and with the header also 404 because the function's `PUSH_DISPATCH_SECRET` is not set yet.
- **Not done by the connector, owner steps remain:** `vault.create_secret` is denied to the connector role, so the two Vault statements (`push_dispatch_secret`, `fcm_endpoint_url`) must run in the SQL editor; the Edge Function secrets `PUSH_DISPATCH_SECRET` and `FIREBASE_SERVICE_ACCOUNT_JSON` must be set in the dashboard; `assetlinks.json` still has no fingerprint; web deploy and signed APK build follow.

### Deployment readback — 2026-09-21

`main` was fast-forwarded to `c2fd010` and pushed with owner authorization. Forty-five seconds later the deployed origin served `/.well-known/assetlinks.json` as `application/json` containing the owner's release-certificate fingerprint (verified by the contract test 4/4), `/manifest.webmanifest` listed `/drawings/new?source=pwa`, `/drawings` redirected a signed-out request to `/sign-in` (307), and the removed `/api/drawing-notes/push-status` answered 404. Vault and Edge Function secrets were set by the owner in the dashboard; the connector cannot read their values, so FCM end-to-end delivery is proven only by the device script. Remaining: owner builds the signed release APK locally (keystore password), installs on both phones, and runs the device script; pgTAP `0012`/`0013` and the Playwright journey remain owed.
