# Phase 8 and 9 verification

Dated 2026-09-05. Records what was actually checked, separately from what was only
implemented. Push has **not** been observed delivering to a real device, because the
VAPID and Vault secrets are not yet configured.

## Automated evidence

| Check | Result |
| --- | --- |
| `npx eslint .` | Passed, no findings |
| `npx vitest run` | 14 files, 89 tests passed (78 before, 11 added) |
| `npx tsc --noEmit` | Passed after regenerating `database.types.ts` |
| `npx next build` | Production build succeeded; `/story` present in the route table |

New unit coverage: story cursor round-trip and rejection of non-date/non-uuid halves
(the cursor is interpolated into a PostgREST filter, so a loose cursor is an
injection surface), year grouping, push subscription schema bounds matching the
database checks, and device labelling.

## Hosted database evidence

Both migrations applied to project `Us-Together`, then verified by query:

| Check | Observed |
| --- | --- |
| `story_entries` view options | `{security_invoker=on}` |
| Cron jobs | `us-together-push-dispatch @ * * * * *`, `us-together-on-this-day @ 0 * * * *` |
| `push_deliveries` policies | 0, with `relforcerowsecurity = true` — deliberate: worker bookkeeping with no application read path |
| `push_subscriptions` policies | 4, with `relforcerowsecurity = true` |
| `notifications_category_check` | now includes `on_this_day` |
| New preference columns | `push_enabled`, `on_this_day_enabled` present |
| `private.dispatch_due_push` callable by admin connection | **No** — `42501 permission denied`, confirming the revoke from `service_role` holds |

The permission denial is the intended result: the dispatcher is reachable only by the
database scheduler, matching `private.deliver_due_plan_reminders`.

## Not verified

- No push has been sent or received. Delivery, retry, dead-lettering, and endpoint
  retirement on 404/410 are implemented and unobserved.
- `On this day` has not been observed firing; it requires a couple with an entry on
  the current month-day in an earlier year, at 09:00 local.
- The Edge Function is not deployed and `web-push` under Supabase Edge Runtime is
  unexercised.
- No two-account browser regression run; the Release 2 carryover R2-08 still stands.
- Installability and the iOS Add to Home Screen path are unverified on a real device.

## Advisors

Run after the DDL. `push_deliveries` appears as `rls_enabled_no_policy` (INFO) — this
is intentional and matches the existing `couple_invitations` finding. `pg_net` in the
public schema is a WARN; see the pg_net section in
[Phase 8 operations](PHASE8_OPERATIONS.md) for why it is not remediable from a
migration. The pre-existing `auth_leaked_password_protection` WARN is unrelated to
this work and remains open.
