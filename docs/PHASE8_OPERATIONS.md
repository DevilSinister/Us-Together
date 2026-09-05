# Installable app, push, and On this day — operations

Added 2026-09-05 alongside `20260905050000_phase8_installable_push.sql` and
`20260905051000_phase9_story_on_this_day.sql`. Nothing here is applied by the
repository; each step is an operator action.

## What ships disabled

Push is dormant until both Vault secrets exist. `private.dispatch_due_push` returns
`0` immediately when either is missing, so the cron job runs harmlessly and no
delivery is attempted. Subscribing a device before configuration succeeds and simply
queues nothing.

## One-time configuration

1. Generate an application server keypair. It is printed once and never written to
   disk; rotating it invalidates every existing subscription.

   ```
   npm run vapid
   ```

2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` and in the Vercel environment.
   The public key identifies the sender to the push service and grants nothing on
   its own, so it is browser-safe.

3. Set the Edge Function secrets. `VAPID_SUBJECT` must be a `mailto:` or `https:`
   URL a push service can contact about your traffic. `PUSH_DISPATCH_SECRET` is any
   long random string; it is the only thing standing between the internet and the
   dispatcher, which answers `404` without it.

   ```
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com PUSH_DISPATCH_SECRET=...
   supabase functions deploy push-dispatch
   ```

4. Store the dispatcher's two Vault secrets. The names are read verbatim by
   `private.push_secret`, and the secret value must equal `PUSH_DISPATCH_SECRET`.

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/push-dispatch', 'push_endpoint_url');
   select vault.create_secret('<the same PUSH_DISPATCH_SECRET>', 'push_dispatch_secret');
   ```

## Scheduled work

| Job | Schedule | Function |
| --- | --- | --- |
| `us-together-push-dispatch` | every minute | `private.dispatch_due_push(50)` |
| `us-together-on-this-day` | hourly, minute 0 | `private.deliver_on_this_day(500)` |

Both are revoked from `public`, `anon`, `authenticated` and `service_role`, matching
`private.deliver_due_plan_reminders`. Only a trusted database scheduler runs them.

On this day fires in the 09:00 hour of each member's own profile timezone, so the
hourly schedule is required — a daily one would serve a single timezone. Idempotency
is keyed on the recipient's local date, so a half-hour-offset zone still receives
exactly one notification per day.

## Safe inspection

Never select notification titles joined to note or wishlist content. These are safe:

```sql
select state, count(*) from public.push_deliveries group by state;
select count(*) from public.push_subscriptions where disabled_at is not null;
select jobname, last_run_started_at, status from cron.job_run_details order by start_time desc limit 20;
```

A delivery retries with exponential backoff to a 15-minute ceiling and dead-letters
to `failed` after five attempts. An endpoint answering `404`/`410` retires its
subscription immediately; twenty scattered failures retire it as well.

## Disabling push

Delete the Vault secrets, or unschedule the job. Existing subscriptions stay valid,
so restoring the secrets resumes delivery without asking anyone to opt in again.

```sql
select cron.unschedule('us-together-push-dispatch');
```

## What push may never carry

The payload is an envelope: the generic title already stored on the notification row
plus a target path. A delivery row can only exist for a notification row, and a
notification row is only written after the existing category checks — so a partner's
private note, a wishlist purchase secret and a gift plan produce no notification,
therefore no push. Do not add a body, a name or an item title to the payload; doing
so would move content into a third-party push service and past the recipient's lock
screen.

## Known finding: pg_net is executable by anon and authenticated

Enabling pg_net granted `EXECUTE` on `net.http_post`, `net.http_get` and
`net.http_delete` to `PUBLIC`, which includes `anon` and `authenticated`. This is
pg_net's install-time default on Supabase, not a choice this project made.

`20260905052000_phase8_restrict_pg_net.sql` attempts to revoke it and **does not
succeed on hosted Supabase**. The `net` schema and its functions are owned by
`supabase_admin`, and PostgreSQL silently ignores a REVOKE from a role that did not
issue the GRANT. The ACL after the migration is still `=X/supabase_admin`. Do not
read that migration as evidence the grant was removed.

Not reachable today, for reasons worth restating because they are the only thing
holding it closed:

- PostgREST exposes `public` and `graphql_public`; `net` has no REST or RPC surface.
- Application clients reach Postgres only through PostgREST and GoTrue, never with a
  direct connection as `anon` or `authenticated`.

It would become reachable if `net` were added to the exposed schemas, or through a
`SECURITY DEFINER` function in `public` that builds dynamic SQL from user input.
Neither exists. Removing the grant requires `supabase_admin` and therefore Supabase
support. Track it as a Release 2 review item; re-check it after any change to
exposed schemas.
