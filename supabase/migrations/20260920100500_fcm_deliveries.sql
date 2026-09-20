-- Android delivery for the notifications that already exist (ADR-032).
--
-- This mirrors the Web Push transport in 20260905050000_phase8_installable_push.sql:
-- a row in public.notifications is the single audience source; delivery bookkeeping is
-- worker-owned and unreadable by application roles; dispatch is a private cron worker
-- that posts an envelope (generic title + target pointer, never content) to an Edge
-- Function through a Vault-stored URL and shared secret; settlement comes back through a
-- service_role-only RPC. The Android device registry is the existing drawing_devices
-- table: a registered token is the opt-in, and sign-out deletes it.

comment on table public.drawing_devices is
  'Android device registry: FCM tokens for the native companion, owner-only. Serves every notification category and holds no content. The presence of a token is the Android push opt-in.';

create table public.fcm_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  token text not null references public.drawing_devices (token) on delete cascade,
  state text not null default 'pending' check (state in ('pending', 'dispatched', 'delivered', 'failed', 'expired')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error_code text check (last_error_code is null or last_error_code in ('delivery_failed', 'token_gone')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fcm_delivery_once unique (notification_id, token)
);
create index fcm_deliveries_due_idx on public.fcm_deliveries (next_attempt_at, id) where state in ('pending', 'dispatched');
create index fcm_deliveries_token_idx on public.fcm_deliveries (token);
create index fcm_deliveries_notification_idx on public.fcm_deliveries (notification_id);

alter table public.fcm_deliveries enable row level security;
alter table public.fcm_deliveries force row level security;
revoke all on table public.fcm_deliveries from anon, authenticated;
comment on table public.fcm_deliveries is 'Worker bookkeeping for one notification to one Android device. No application role can read it.';

-- Fan-out: every notification the recipient can already see reaches each of their
-- registered Android devices. No content is read and no preference is re-evaluated;
-- the category preference already decided whether the notification row exists.
create function private.enqueue_fcm_for_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.fcm_deliveries (notification_id, token)
  select new.id, device.token
  from public.drawing_devices device
  where device.user_id = new.recipient_id
  on conflict on constraint fcm_delivery_once do nothing;
  return new;
end $$;
revoke all on function private.enqueue_fcm_for_notification() from public, anon, authenticated;
create trigger notifications_enqueue_fcm after insert on public.notifications
  for each row execute function private.enqueue_fcm_for_notification();

-- Dormant until an operator stores fcm_endpoint_url in Vault (push_dispatch_secret is
-- shared with the Web Push worker). See docs/PHASE8_OPERATIONS.md.
create function private.dispatch_due_fcm(batch_size int default 50)
returns int language plpgsql set search_path = '' as $$
declare
  endpoint_url text := private.push_secret('fcm_endpoint_url');
  dispatch_secret text := private.push_secret('push_dispatch_secret');
  payload jsonb;
  dispatched int;
begin
  if endpoint_url is null or dispatch_secret is null then return 0; end if;

  with claimed as (
    select delivery.id, delivery.attempts, delivery.token,
           notification.id as notification_id, notification.title, notification.category,
           notification.target_type, notification.target_id
    from public.fcm_deliveries delivery
    join public.notifications notification on notification.id = delivery.notification_id
    where delivery.state in ('pending', 'dispatched')
      and delivery.next_attempt_at <= now()
      and notification.read_at is null
    order by delivery.next_attempt_at, delivery.id
    limit least(greatest(batch_size, 1), 200)
    for update of delivery skip locked
  ), marked as (
    update public.fcm_deliveries delivery
    set state = 'dispatched',
        attempts = delivery.attempts + 1,
        next_attempt_at = now() + make_interval(secs => least(900, 60 * power(2, delivery.attempts)::int))
    from claimed where delivery.id = claimed.id
    returning delivery.id
  )
  select jsonb_agg(jsonb_build_object(
    'deliveryId', claimed.id,
    'token', claimed.token,
    'notificationId', claimed.notification_id,
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
revoke all on function private.dispatch_due_fcm(int) from public, anon, authenticated, service_role;
comment on function private.dispatch_due_fcm(int) is 'Invoked by a trusted database scheduler; sends a notification envelope to Android devices only, never content.';

-- Settlement: outcomes only. A dead token (UNREGISTERED) deletes the device row, and the
-- cascade removes every delivery that still pointed at it.
create function public.settle_fcm_deliveries(input jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb;
begin
  for item in select * from jsonb_array_elements(coalesce(input -> 'results', '[]'::jsonb)) loop
    if item ->> 'outcome' = 'delivered' then
      update public.fcm_deliveries
      set state = 'delivered', delivered_at = now(), next_attempt_at = now(), last_error_code = null
      where id = (item ->> 'deliveryId')::uuid;
      update public.drawing_devices device
      set last_seen_at = now()
      from public.fcm_deliveries delivery
      where delivery.id = (item ->> 'deliveryId')::uuid and device.token = delivery.token;

    elsif item ->> 'outcome' = 'gone' then
      delete from public.drawing_devices device
      using public.fcm_deliveries delivery
      where delivery.id = (item ->> 'deliveryId')::uuid and device.token = delivery.token;

    else
      update public.fcm_deliveries
      set state = case when attempts >= 5 then 'failed' else 'pending' end, last_error_code = 'delivery_failed'
      where id = (item ->> 'deliveryId')::uuid;
    end if;
  end loop;
end $$;
revoke all on function public.settle_fcm_deliveries(jsonb) from public, anon, authenticated;
grant execute on function public.settle_fcm_deliveries(jsonb) to service_role;
comment on function public.settle_fcm_deliveries(jsonb) is 'Edge Function callback. Records per-device outcomes; cannot widen an audience or read content.';

select cron.schedule('us-together-fcm-dispatch', '* * * * *', 'select private.dispatch_due_fcm(50)');

notify pgrst, 'reload schema';
