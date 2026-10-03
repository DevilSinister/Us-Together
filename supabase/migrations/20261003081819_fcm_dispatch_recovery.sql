-- Bound before exponentiation/casting: a retry must never abort the entire queue.
create function private.fcm_retry_seconds(attempts integer)
returns integer language sql immutable security invoker set search_path = '' as $$
  select least(900, 60 * (1 << least(4, greatest(0, attempts))));
$$;
revoke all on function private.fcm_retry_seconds(integer) from public, anon, authenticated, service_role;

-- Exceptional definer: only the internal service role can compare a candidate with
-- the scheduler's Vault secret. Returns a boolean, never the stored secret.
create function private.authorize_fcm_dispatch(presented_secret text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Internal dispatcher only.';
  end if;
  return coalesce(length(presented_secret) >= 20
    and presented_secret = private.push_secret('push_dispatch_secret'), false);
end;
$$;
revoke all on function private.authorize_fcm_dispatch(text) from public, anon, authenticated;
grant execute on function private.authorize_fcm_dispatch(text) to service_role;

create function public.authorize_fcm_dispatch(presented_secret text)
returns boolean language sql security invoker set search_path = '' as $$
  select private.authorize_fcm_dispatch(presented_secret);
$$;
revoke all on function public.authorize_fcm_dispatch(text) from public, anon, authenticated;
grant execute on function public.authorize_fcm_dispatch(text) to service_role;
comment on function public.authorize_fcm_dispatch(text) is 'Internal service-only shared-secret comparison; returns no Vault data.';

create or replace function private.dispatch_due_fcm(batch_size int default 50)
returns int language plpgsql set search_path = '' as $$
declare
  endpoint_url text := private.push_secret('fcm_endpoint_url');
  dispatch_secret text := private.push_secret('push_dispatch_secret');
  payload jsonb;
  dispatched int;
begin
  if endpoint_url is null or dispatch_secret is null then return 0; end if;

  -- Inbox history remains; only obsolete transport work expires.
  update public.fcm_deliveries delivery set state = 'expired'
  from public.notifications notification
  where notification.id = delivery.notification_id
    and delivery.state in ('pending', 'dispatched')
    and (delivery.created_at <= now() - interval '1 hour' or notification.read_at is not null);

  -- Missing callbacks must not retry forever or starve new deliveries.
  update public.fcm_deliveries set state = 'failed', last_error_code = 'delivery_failed'
  where state in ('pending', 'dispatched') and attempts >= 5 and next_attempt_at <= now();

  with claimed as (
    select delivery.id, delivery.attempts, delivery.token,
           notification.id as notification_id, notification.title, notification.category,
           notification.target_type, notification.target_id
    from public.fcm_deliveries delivery
    join public.notifications notification on notification.id = delivery.notification_id
    where delivery.state in ('pending', 'dispatched')
      and delivery.attempts < 5
      and delivery.next_attempt_at <= now()
      and notification.read_at is null
    order by delivery.next_attempt_at, delivery.id
    limit least(greatest(batch_size, 1), 200)
    for update of delivery skip locked
  ), marked as (
    update public.fcm_deliveries delivery
    set state = 'dispatched',
        attempts = delivery.attempts + 1,
        next_attempt_at = now() + make_interval(secs => private.fcm_retry_seconds(delivery.attempts))
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


notify pgrst, 'reload schema';
