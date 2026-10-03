# Multi-image upload repair — 2026-10-02

The owner reports processing and intermittent network errors for batches in both Memories and Moments. Both use the same uploader and Edge processor.

Confirmed defects: the processor resolved an unexported `x86/magick.wasm` package subpath, forcing CDN fallback and hash work for every photo. The uploader stopped the entire batch after one processing failure, and a retry allocated another row and uploaded the original again. The loader now resolves the exported `magick.wasm`, shares verified initialization per worker, and allows initialization retry after an outage. Files continue independently and failed finalization retries the same uploaded row. This is a source repair; no production root-cause log was available.

Gates:

- Lint: exit 0.
- Typecheck: exit 0.
- Unit tests: exit 0, 234 tests in 38 files. Six new regressions cover 30 real JPEG/PNG decodes, concurrent initialization sharing, initialization retry, 30-file sequencing, failure continuation, allocation reuse and cancellation.
- Production build: exit 0.
- Desktop/mobile Playwright: `npx playwright test --config playwright.upload.config.ts`, exit 0, both projects passed. Each checked Memories and Moments with a bad middle file, caption preservation, continuation, 30-photo completion, keyboard submission and no horizontal overflow under reduced motion. The first run reached 30 photos but its global alert assertion counted Next's empty route announcer; the assertion was scoped to upload errors and the final run passed. Preview uses browser-local IndexedDB, not hosted Storage or Edge functions.
- Negative RLS suite: attempted, connection refused at local PostgreSQL port 54322; no assertions ran.
- Supabase security/performance advisors: attempted, CLI access token absent; no advisor findings retrieved.
- Migration reset/application/list: not run; no schema or policy change, local database unavailable.
- Hosted binary/TUS and authenticated two-account tests: not run; no authenticated Supabase tooling available in this session.
- In-app browser: attempted; Windows sandbox setup failed before initialization. Playwright is a separate browser check.
- Secret/log review: changed-file scan and manual diff review passed; no private image data or credentials added to logs or documentation.
- Android/device tests: not run; APK source did not change.
- Graph refresh: not run; scoped bug repair rather than a major implementation phase. Existing graph was queried before source exploration.

Activation requires both the web changes and redeployment of the `memory-media` Edge function with its decoder dependencies. Neither was pushed/deployed in this session. Existing Supabase CPU/memory limits remain; the small-image local decoder test does not establish hosted acceptance of every photo up to the advertised maximum size.

## Publication follow-up — 2026-10-02

The owner authorized branch publication, a PR and function redeployment. The repair is being published on the existing `sinister/changes` branch. `supabase functions deploy memory-media --use-api` was attempted but returned `Access token not provided`; no deployment occurred. Plugin discovery confirms Supabase is installed and enabled, but this chat exposes no Supabase tools. CLI login is required to proceed with deployment and hosted verification. No schema migration is needed.

## Supabase redeployment completed — 2026-10-02

This supersedes the deployment/access blocker above. The Supabase plugin became available and authenticated in a subsequent turn. The project was confirmed by name before deployment. The plugin deployed `memory-media` version 12 with `verify_jwt=true`; status is ACTIVE. Readback confirmed all four uploaded source files match the repository after line-ending normalization, including both decoder modules and media validation. An unauthenticated POST returned HTTP 401.

Security and performance advisors ran before and after deployment with unchanged findings: four informational RLS-without-policy findings, the existing public `pg_net` extension and disabled leaked-password protection warnings, 41 informational unused-index findings and one duplicate-index warning. No schema change or migration was made. These notices are not a clean-advisor claim.

Branch commit `ceca37e` and PR #9 were published; web CI, Android CI and Vercel preview passed. PR #9 remains open and unmerged, so production web batch handling is not claimed updated. The deployed processor is backward-compatible with the existing web contract. Hosted signed-in multi-file TUS/processing, large-photo runtime-limit acceptance, negative RLS, clean migration replay and device tests remain unverified; the endpoint smoke verifies only routing and anonymous denial.

## Exact-file hosted batch diagnosis — 2026-10-03

Three owner-supplied photos were tested sequentially against the deployed processor using the existing isolated authenticated fixture and the application's six-MiB TUS configuration. All three allocations and transfers succeeded. The first JPEG finalized successfully; the second JPEG and PNG returned HTTP 422 with the generic processing message. One finalization retry per failed allocation produced the same result without re-uploading. Authenticated downloads matched each local original byte-for-byte; the failed files had no preview object. All three files passed the repository validator and the pinned ImageMagick preview pipeline locally. This narrows the reproduced defect to hosted preview generation, not file limits or transfer corruption; the underlying caught exception remains unknown because the handler neither classifies nor logs it.

A separate processor log records CPU Time exceeded and HTTP 546. This confirms a runtime-limit failure exists, but does not prove CPU exhaustion caused the two reproduced HTTP 422 responses. Do not describe the exact-file root cause as established. Next diagnostic step: classify processing stages and sanitized decoder error categories, then rerun these originals in the hosted runtime. No raw decoder messages, filenames, content, paths, IDs or tokens should enter logs.

Gates run: local three-file validation/decode PASS; authenticated fixture/parent access PASS; hosted three-file TUS transfer PASS; hosted finalization FAIL (one ready, two 422); same-row retries FAIL (two 422); authenticated stored-byte comparison PASS; test-upload cleanup PASS (three rows removed via authorized handler with readback). Graph queried before source tracing; map is historical and truncated. In-app browser BLOCKED at Windows sandbox startup; required browser:control-in-app-browser skill unavailable in this session. Terminal and Node REPL sandbox setup failed; reviewed direct terminal execution worked.

Not run: lint, typecheck, full unit/integration suite, production build, negative RLS/authorization suite, desktop/mobile UI, keyboard/reduced motion, Android/device, migration reset/application/list, database/security advisors, automated secret scan and graph refresh. This was a diagnostic run with documentation-only changes, no application/schema/deployment change. Credentials remained in ignored fixture configuration and were not printed. Diagnostic photos were removed from the test memory; owner stories and Downloads originals were not modified. Hosted upload acceptance remains FAILED.


## Confirmed cause and deployed repair — 2026-10-03

This supersedes the earlier preview-generation diagnosis. Safe processor stage diagnostics showed all three originals reaching `publish`. A rolled-back publication on a diagnostic row reproduced SQLSTATE 42501: the older notification guard prohibited the photo-count/title/time update made by `private.partner_activity`. That trigger error rolled back the ready-media update. Ordinary authenticated preview download failure did not prove preview absence: until publication assigns `derivative_path`, Storage RLS cannot authorize that deterministic preview path.

Migration `20261003070559_media_notification_aggregation_guard.sql` is applied and its version/name verified in the hosted ledger. The guard remains security invoker with empty search path, and anonymous/authenticated direct execution remains revoked. Identity/routing stays immutable for everyone; title/time/count updates require a nested trigger running as postgres (the verified existing activity-trigger owner). Direct authenticated updates remain read-state-only, now including explicit protection against activity-count forgery. No new security-definer function, policy or public grant was added. ADR-044 and the database/operations contracts record the trust boundary.

Processor version 13 is active with JWT verification, and all five deployed source files match the repository after newline normalization. It logs only allow-listed stage/category values; no raw errors, identifiers, paths, filenames, URLs, credentials or photo content. A privacy regression asserts that arbitrary private messages and stages cannot enter diagnostics.

Final gates:
- Original three-file recovery: PASS, all three already-uploaded diagnostic rows finalized ready with validated dimensions and previews, without another original transfer.
- Larger hosted batch: PASS, 12 sequential authenticated TUS transfers and 12 ready finalizations using the same originals. No CPU-limit error in this run.
- Hosted Moments integration: PASS, 43 checks including multi-file finalization, partner reads, foreign read/write/comment denial, gallery cursors/filters and cleanup.
- Isolated guard authorization regressions: PASS, five assertions before and after application, including the final pgTAP-shaped suite file `supabase/tests/database/0014_notification_aggregation_guard.test.sql`. Temporary tables/functions roll back; no production users/rows were created for these guard tests.
- Lint: PASS, exit 0. Typecheck: PASS, exit 0. Unit tests: PASS, exit 0, 235 tests in 39 files. Production build: PASS, exit 0.
- Desktop/mobile Playwright: PASS, two projects, both entry kinds, bad-file continuation, 30-photo batches, keyboard submission, reduced motion and no horizontal overflow. Command: `node node_modules/@playwright/test/cli.js test --config playwright.upload.config.ts`. The first npm wrapper misrouted the config and ran no tests; the corrected invocation passed. Build output was temporarily isolated and preview/config/generated type settings restored byte-for-byte.
- Migration application/ledger verification and function source/JWT readback: PASS. Clean migration reset/replay: NOT RUN, no disposable local database available.
- Security/performance advisors: RAN before/after. Security unchanged: four informational RLS-without-policy findings, existing public pg_net and disabled leaked-password protection warnings. Unused indexes decreased from 41 to 40 after exercising the code; the duplicate-index warning remains. No new finding; not a clean-advisor claim.
- Full negative RLS suite: BLOCKED, local PostgreSQL connection refused at port 54322 before assertions. The focused hosted guard checks and actual foreign-account integration above are separate passing evidence.
- In-app browser: BLOCKED by recorded Windows sandbox startup failure; required browser skill unavailable. Playwright browser evidence above passed separately.
- Secret/diff/log review: PASS for changed and new files; no credential/project-reference patterns, whitespace errors or raw-sensitive logging introduced. All 15 original-photo diagnostic uploads from this implementation run were removed through the authenticated handler with absent-row readback; the Moments suite cleaned its own two swatches and temporary entry. Downloads originals and owner stories were untouched.
- Android/device tests, complete browser suite, maximum-size/25-megapixel and overlapping-worker stress, and Graphify refresh: NOT RUN for this scoped backend repair. Existing graph was queried first. The separately observed CPU-limit event remains a capacity risk, but was not the cause of the confirmed 42501 batch failure and was not reproduced by the 12-file batch.

No Git commit, push or web deployment was performed. The database repair and diagnostic Edge deployment are live; local source/docs remain reviewable in the working tree. The prior web batch-handling PR publication state is unchanged.
