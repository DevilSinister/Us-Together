-- Phase 8: Web Push delivery for the notifications that already exist.
--
-- This adds a transport, not a new disclosure surface. Push never derives its own
-- audience: a row in public.notifications is the single source of truth, and that
-- row is only ever written after the existing category preference check. So a
-- partner-private note, a wishlist purchase secret and a gift plan stay invisible
-- here for the same reason they are invisible in the inbox — no notification row is
-- created for them at all, therefore no delivery row can exist either.
--
-- The payload the browser receives is an envelope: the generic title already stored
-- on the notification row, plus a target path. No note body, item title or secret
-- state is read by the dispatcher or sent to a push service.
--
-- Delivery follows the proven private.deliver_due_plan_reminders shape: a private
-- worker, revoked from every application role, claimed with SKIP LOCKED, bounded
-- retry with a dead-letter state, and idempotency per (notification, subscription).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 2048 and endpoint ~ '^https://'),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  label text check (label is null or char_length(btrim(label)) between 1 and 80),
  failure_count integer not null default 0 check (failure_count >= 0),
  disabled_at timestamptz,
  last_delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  state text not null default 'pending' check (state in ('pending', 'dispatched', 'delivered', 'failed', 'expired')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error_code text check (last_error_code is null or last_error_code in ('delivery_failed', 'subscription_gone')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint push_delivery_once unique (notification_id, subscription_id)
);

alter table public.notification_preferences add column push_enabled boolean not null default false;
comment on column public.notification_preferences.push_enabled is 'Opt-in transport switch. Category choices still decide whether a notification row exists at all.';

-- Delivery bookkeeping is the server's. A caller may rename a device and nothing else.
create function private.guard_push_subscription()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' and current_user in ('authenticated', 'anon')
     and (new.failure_count <> 0 or new.disabled_at is not null or new.last_delivered_at is not null) then
    raise exception using errcode = '42501', message = 'Push delivery state is server-managed.';
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.endpoint <> old.endpoint then
      raise exception using errcode = '42501', message = 'A subscription cannot change owner or endpoint.';
    end if;
    if current_user in ('authenticated', 'anon')
       and (new.failure_count <> old.failure_count
            or new.disabled_at is distinct from old.disabled_at
            or new.last_delivered_at is distinct from old.last_delivered_at) then
      raise exception using errcode = '42501', message = 'Push delivery state is server-managed.';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_push_subscription() from public, anon, authenticated;
create trigger push_subscriptions_guard before insert or update on public.push_subscriptions for each row execute function private.guard_push_subscription();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function private.set_updated_at();

-- Every notification the recipient can already see fans out to their live devices.
-- The audience is the notification row itself, so no preference is re-evaluated and
-- no content is read: this trigger never touches notes, wishlists or their secrets.
create function private.enqueue_push_for_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.push_deliveries (notification_id, subscription_id)
  select new.id, subscription.id
  from public.push_subscriptions subscription
  join public.notification_preferences preference on preference.user_id = subscription.user_id
  where subscription.user_id = new.recipient_id
    and subscription.disabled_at is null
    and preference.push_enabled
  on conflict on constraint push_delivery_once do nothing;
  return new;
end $$;
revoke all on function private.enqueue_push_for_notification() from public, anon, authenticated;
create trigger notifications_enqueue_push after insert on public.notifications for each row execute function private.enqueue_push_for_notification();

-- Dispatch is dormant until an operator stores both secrets in Vault, so the feature
-- ships disabled rather than half-wired. See docs/PHASE8_OPERATIONS.md.
create function private.push_secret(secret_name text)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;
revoke all on function private.push_secret(text) from public, anon, authenticated, service_role;

create function private.dispatch_due_push(batch_size int default 50)
returns int language plpgsql set search_path = '' as $$
declare
  endpoint_url text := private.push_secret('push_endpoint_url');
  dispatch_secret text := private.push_secret('push_dispatch_secret');
  payload jsonb;
  dispatched int;
begin
  if endpoint_url is null or dispatch_secret is null then return 0; end if;

  with claimed as (
    select delivery.id, delivery.attempts, subscription.endpoint, subscription.p256dh, subscription.auth,
           notification.title, notification.category, notification.target_type, notification.target_id
    from public.push_deliveries delivery
    join public.push_subscriptions subscription on subscription.id = delivery.subscription_id and subscription.disabled_at is null
    join public.notifications notification on notification.id = delivery.notification_id
    where delivery.state in ('pending', 'dispatched')
      and delivery.next_attempt_at <= now()
      and notification.read_at is null
    order by delivery.next_attempt_at, delivery.id
    limit least(greatest(batch_size, 1), 200)
    for update of delivery skip locked
  ), marked as (
    update public.push_deliveries delivery
    set state = 'dispatched',
        attempts = delivery.attempts + 1,
        -- Retried only if no settlement arrives; the unique constraint and the
        -- notification tag make a duplicate send harmless rather than a second alert.
        next_attempt_at = now() + make_interval(secs => least(900, 60 * power(2, delivery.attempts)::int))
    from claimed where delivery.id = claimed.id
    returning delivery.id
  )
  select jsonb_agg(jsonb_build_object(
    'deliveryId', claimed.id,
    'endpoint', claimed.endpoint,
    'p256dh', claimed.p256dh,
    'auth', claimed.auth,
    'title', claimed.title,
    'category', claimed.category,
    'targetType', claimed.target_type,
    'targetId', claimed.target_id
  )) into payload from claimed;

  if payload is null then return 0; end if;
  dispatched := jsonb_array_length(payload);

  perform net.http_post(
    url => endpoint_url,
    body => jsonb_build_object('deliveries', payload),
    headers => jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', dispatch_secret),
    timeout_milliseconds => 20000
  );
  return dispatched;
end $$;
revoke all on function private.dispatch_due_push(int) from public, anon, authenticated, service_role;
comment on function private.dispatch_due_push(int) is 'Invoked by a trusted database scheduler; sends a notification envelope only, never content.';

-- Settlement is the one push function an application role may call, because the Edge
-- Function must report per-endpoint outcomes back. It accepts outcomes only, never a
-- new audience, and cannot create a delivery or read a notification's subject.
create function public.settle_push_deliveries(input jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb;
begin
  for item in select * from jsonb_array_elements(coalesce(input -> 'results', '[]'::jsonb)) loop
    if item ->> 'outcome' = 'delivered' then
      update public.push_deliveries
      set state = 'delivered', delivered_at = now(), next_attempt_at = now(), last_error_code = null
      where id = (item ->> 'deliveryId')::uuid;
      update public.push_subscriptions subscription
      set last_delivered_at = now(), failure_count = 0
      from public.push_deliveries delivery
      where delivery.id = (item ->> 'deliveryId')::uuid and subscription.id = delivery.subscription_id;

    elsif item ->> 'outcome' = 'gone' then
      -- The push service says this endpoint is permanently invalid. Retiring the
      -- subscription stops every future delivery to a device that no longer exists.
      update public.push_deliveries
      set state = 'expired', last_error_code = 'subscription_gone'
      where id = (item ->> 'deliveryId')::uuid;
      update public.push_subscriptions subscription
      set disabled_at = now()
      from public.push_deliveries delivery
      where delivery.id = (item ->> 'deliveryId')::uuid and subscription.id = delivery.subscription_id;

    else
      update public.push_deliveries
      set state = case when attempts >= 5 then 'failed' else 'pending' end, last_error_code = 'delivery_failed'
      where id = (item ->> 'deliveryId')::uuid;
      update public.push_subscriptions subscription
      set failure_count = subscription.failure_count + 1,
          disabled_at = case when subscription.failure_count + 1 >= 20 then now() else subscription.disabled_at end
      from public.push_deliveries delivery
      where delivery.id = (item ->> 'deliveryId')::uuid and subscription.id = delivery.subscription_id;
    end if;
  end loop;
end $$;
revoke all on function public.settle_push_deliveries(jsonb) from public, anon, authenticated;
grant execute on function public.settle_push_deliveries(jsonb) to service_role;
comment on function public.settle_push_deliveries(jsonb) is 'Edge Function callback. Records per-endpoint outcomes; cannot widen an audience or read content.';

create index push_subscriptions_user_idx on public.push_subscriptions (user_id, id desc);
create index push_subscriptions_live_idx on public.push_subscriptions (user_id) where disabled_at is null;
create index push_deliveries_due_idx on public.push_deliveries (next_attempt_at, id) where state in ('pending', 'dispatched');
create index push_deliveries_subscription_idx on public.push_deliveries (subscription_id);
create index push_deliveries_notification_idx on public.push_deliveries (notification_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
alter table public.push_deliveries enable row level security;
alter table public.push_deliveries force row level security;

revoke all on table public.push_subscriptions, public.push_deliveries from anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
-- push_deliveries carries no policy on purpose: it is worker bookkeeping, and no
-- application role has a readable path to it.

create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_subscriptions_update_own" on public.push_subscriptions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

comment on table public.push_subscriptions is 'User-owned Web Push endpoint. Readable and removable only by its owner; delivery counters are server-managed.';
comment on table public.push_deliveries is 'Worker bookkeeping for one notification to one endpoint. No application role can read it.';

select cron.schedule('us-together-push-dispatch', '* * * * *', 'select private.dispatch_due_push(50)');
