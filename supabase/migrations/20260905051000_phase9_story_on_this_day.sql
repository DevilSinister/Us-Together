-- Phase 9: Our Story timeline and the On this day anniversary notification.
--
-- Our Story reads only the four couple-shared tables. Notes and wishlists are absent
-- by construction, not by filter, so an author-private note or a purchase secret can
-- never reach the timeline even if a future policy loosened elsewhere.
--
-- The view is security_invoker, so every row still passes the underlying table's own
-- row level security as the querying member. It adds no new read path; it only joins
-- provenance that the tables already record.

create view public.story_entries
with (security_invoker = on) as
  select 'milestone'::text as kind, milestone.id, milestone.couple_id, milestone.milestone_date as occurred_on,
         milestone.title, milestone.location, null::uuid as source_bucket_item_id, null::uuid as source_plan_id
  from public.milestones milestone
union all
  select 'memory', memory.id, memory.couple_id, memory.memory_date,
         memory.title, memory.location, memory.source_bucket_item_id, memory.source_plan_id
  from public.memories memory
union all
  -- Only a plan that actually happened belongs in a story; a cancelled or future one does not.
  select 'plan', plan.id, plan.couple_id, (plan.starts_at at time zone plan.originating_timezone)::date,
         plan.title, plan.location, plan.source_bucket_item_id, null::uuid
  from public.plans plan
  where plan.status = 'completed'
union all
  select 'bucket', item.id, item.couple_id, item.completed_at::date,
         item.title, item.location, null::uuid, null::uuid
  from public.bucket_list_items item
  where item.status = 'completed' and item.completed_at is not null;

revoke all on public.story_entries from anon;
grant select on public.story_entries to authenticated;
comment on view public.story_entries is 'Shared relationship timeline over milestones, memories, completed plans and completed bucket items. security_invoker, so table policies still decide every row. Notes and wishlists are structurally absent.';

-- Keyset pagination orders by (occurred_on desc, id desc); these back each branch.
create index memories_couple_date_story_idx on public.memories (couple_id, memory_date desc, id desc);
create index plans_couple_completed_story_idx on public.plans (couple_id, starts_at desc, id desc) where status = 'completed';
create index bucket_items_couple_completed_story_idx on public.bucket_list_items (couple_id, completed_at desc, id desc) where status = 'completed' and completed_at is not null;

alter table public.notification_preferences add column on_this_day_enabled boolean not null default true;
comment on column public.notification_preferences.on_this_day_enabled is 'Anniversary resurfacing of the couple''s own shared entries.';

alter table public.notifications drop constraint notifications_category_check;
alter table public.notifications add constraint notifications_category_check
  check (category in ('plan', 'memory', 'milestone', 'note', 'system', 'on_this_day'));

-- Resurfaces a shared entry from the same calendar day in an earlier year.
--
-- Run hourly; each member is notified in the 09:00 hour of their own profile
-- timezone, which is why the local date — not the UTC date — keys idempotency. A
-- half-hour-offset zone still matches exactly once, because the local hour is
-- computed per recipient rather than assumed from the UTC hour.
--
-- The title carries no entry title, and the target is an id the recipient could
-- already open. A couple with nothing on this date receives nothing at all.
create function private.deliver_on_this_day(batch_size int default 500)
returns int language plpgsql set search_path = '' as $$
declare inserted int;
begin
  with recipient as (
    select membership.user_id, membership.couple_id,
           (now() at time zone coalesce(profile.timezone, 'UTC'))::date as local_date
    from public.couple_memberships membership
    join public.profiles profile on profile.user_id = membership.user_id
    join public.notification_preferences preference
      on preference.user_id = membership.user_id and preference.in_app_enabled and preference.on_this_day_enabled
    where membership.left_at is null
      and extract(hour from (now() at time zone coalesce(profile.timezone, 'UTC'))) = 9
  ), chosen as (
    -- A dated moment outranks a memory: an anniversary is the stronger signal.
    select recipient.user_id, recipient.couple_id, recipient.local_date,
           coalesce(moment.kind, memory.kind) as target_kind,
           coalesce(moment.id, memory.id) as target_id
    from recipient
    left join lateral (
      select 'milestone'::text as kind, milestone.id
      from public.milestones milestone
      where milestone.couple_id = recipient.couple_id
        and to_char(milestone.milestone_date, 'MM-DD') = to_char(recipient.local_date, 'MM-DD')
        and milestone.milestone_date < recipient.local_date
      order by milestone.milestone_date desc, milestone.id desc limit 1
    ) moment on true
    left join lateral (
      select 'memory'::text as kind, memory.id
      from public.memories memory
      where memory.couple_id = recipient.couple_id
        and to_char(memory.memory_date, 'MM-DD') = to_char(recipient.local_date, 'MM-DD')
        and memory.memory_date < recipient.local_date
      order by memory.memory_date desc, memory.id desc limit 1
    ) memory on true
  )
  insert into public.notifications (recipient_id, couple_id, category, title, target_type, target_id, idempotency_key)
  select user_id, couple_id, 'on_this_day', 'Something happened on this day', target_kind, target_id,
         'on-this-day:' || user_id::text || ':' || local_date::text
  from chosen
  where target_id is not null
  order by user_id
  limit least(greatest(batch_size, 1), 2000)
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end $$;
revoke all on function private.deliver_on_this_day(int) from public, anon, authenticated, service_role;
comment on function private.deliver_on_this_day(int) is 'Invoked by a trusted database scheduler; content-minimal and idempotent per recipient per local date.';

select cron.schedule('us-together-on-this-day', '0 * * * *', 'select private.deliver_on_this_day(500)');
