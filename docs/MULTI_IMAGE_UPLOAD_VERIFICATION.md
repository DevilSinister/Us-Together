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
