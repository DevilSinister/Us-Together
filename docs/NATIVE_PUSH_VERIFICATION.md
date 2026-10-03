# Native push verification - 2026-10-03

## Confirmed failure and repair

The live Android FCM worker aborted with integer overflow after repeated unsettled dispatches. Its arithmetic overflowed before LEAST applied the intended cap, blocking newer work. Its endpoint was correct, but the Edge dispatcher rejected the scheduler's shared secret with 404. Registered devices and the cron schedule were present.

The applied migrations bound arithmetic before multiplication, limit missing-callback retries, and expire read or stale logical activity without deleting inbox history. Aggregation freshness follows the refreshed notification timestamp, preserving renewed media alerts on reused delivery rows. The dispatcher now verifies the scheduler header against the same Vault source through a service-only boolean RPC. It validates batches with Zod, sends visible alerts at high priority, and removes devices only for explicit typed FCM UNREGISTERED responses. No APK change is required.

## Final gates

- PASS: `npm run lint`, `npm run typecheck`, full Vitest suite (245 tests in 40 files); final focused dispatcher checks (10 tests) also pass after validation count changes.
- PASS: `npm run build`. No web UI change or browser test was needed for this backend repair.
- PASS: three migrations applied and ledger verified. CLI-created filenames aligned with hosted versions `20261003081819`, `20261003082022`, `20261003083004`. Clean reset/replay NOT RUN: no disposable local database.
- PASS: 13 hosted rollback pgTAP checks: bounded arithmetic including attempt 26 and maximum integer, refreshed/stale/read activity, anonymous/member denial, and wrong/missing internal-secret rejection. The first run caught missing service-role schema USAGE; the explicit follow-up grant corrected it and the final suite passed.
- PASS: dispatcher version 6 ACTIVE; custom authentication retained with gateway JWT verification disabled. All four deployed source files match after newline normalization. Authenticated empty-batch invocation returns 200 rather than the former 404; a live unauthenticated request returns 404, and missing/wrong authentication is covered by the handler regressions.
- PASS: cron readback shows successful runs after the repair. Obsolete transport work expires; inbox records remain intact.
- PASS: owner-approved Google FCM `validate_only` check returned accepted registrations plus obsolete UNREGISTERED registrations, with no other failure. No notification was sent and no settlement or device deletion occurred in validation mode. A separate anonymous per-account check confirms each account has an accepted registration and an obsolete registration, with no other failures. No tokens or account identifiers were printed or documented.
- RAN: before/after security and performance advisors, unchanged findings. Security: four informational RLS-without-policy findings and existing pg_net/public and disabled leaked-password-protection warnings. Performance: 40 unused indexes and existing duplicate-index warning. This is not a clean-advisor claim.
- BLOCKED: full `npm run test:rls`, local PostgreSQL refused connection at 127.0.0.1:54322 before assertions. Focused hosted permission/freshness evidence above remains separate.
- NOT RUN: Android build/lint/JVM, native permission/channel display, physical background/Doze delivery and notification tapping. Android source is unchanged; `adb devices` reports no attached device. Desktop/mobile/browser/reduced-motion checks and Graphify refresh were not run for this scoped backend-only repair. Graphify was queried first.
- PASS: staged source secret/log/whitespace review; no sensitive logging introduced. The Google-token validation was initially rejected by automatic approval review, then explicitly authorized by the owner and completed without sending an alert.

## Configuration and release

Keep Firebase service-account JSON only in the Edge Function environment. FCM's dispatch secret has one source in Vault; an Edge copy is no longer required. A native session, token registration and Android notification permission are still prerequisites on the phone. Supabase and Firebase official scheduling/client/message documentation and the current Supabase changelog were checked before implementation.

The backend repair is live. Git delivery is recorded separately; web merge/deployment and APK publication are not required for this repair.
