-- A dream is lived on a day the two of you choose, and Our Story tells it once.
--
-- Until now a completed dream was dated by the instant someone pressed "Mark complete",
-- and a dream kept as a memory appeared twice on the timeline: once as "Dream lived" and
-- again as the memory. Three changes:
--
--   * bucket_list_items.lived_on is the calendar day the dream was lived. It is set when
--     the dream is completed (the member's own today when none is given), can be moved
--     later, and is cleared if the dream is reopened.
--   * A dream and the memory kept directly from it share that day: moving either moves
--     the other, so the dream page and the timeline never disagree.
--   * Our Story leaves out a dream or a kept plan once a memory tells its story. The
--     memory already names where it came from, and carries the photos.

alter table public.bucket_list_items add column lived_on date
  check (lived_on is null or lived_on >= date '1900-01-01');
comment on column public.bucket_list_items.lived_on is
  'The calendar day the dream was lived. Present exactly when the idea is completed; kept in step with the memory saved directly from it.';

-- Backfill without waking the revision or partner-activity triggers: this is not a
-- change anyone made, and no partner should be told a dream was edited.
alter table public.bucket_list_items disable trigger user;
update public.bucket_list_items item set lived_on = coalesce(
  (select memory.memory_date from public.memories memory
   where memory.source_bucket_item_id = item.id and memory.source_plan_id is null
   order by memory.created_at limit 1),
  item.completed_at::date,
  item.updated_at::date)
where item.status = 'completed';
alter table public.bucket_list_items enable trigger user;

alter table public.bucket_list_items add constraint bucket_lived_on_when_completed
  check ((status = 'completed') = (lived_on is not null));

create or replace function private.bucket_item_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare zone text;
begin
  if tg_op = 'UPDATE' then new.version := old.version + 1; else new.version := 0; end if;
  if new.status = 'completed' then
    if tg_op = 'UPDATE' and old.status = 'completed' then
      new.completed_by := old.completed_by; new.completed_at := old.completed_at;
      new.lived_on := coalesce(new.lived_on, old.lived_on);
    else new.completed_by := auth.uid(); new.completed_at := now(); end if;
    if new.lived_on is null then
      -- Today where this member lives, not in UTC: an evening in Karachi is not tomorrow.
      select zones.name into zone from public.profiles profile
        join pg_catalog.pg_timezone_names zones on zones.name = profile.timezone
        where profile.user_id = auth.uid();
      new.lived_on := (now() at time zone coalesce(zone, 'UTC'))::date;
    end if;
  else new.completed_by := null; new.completed_at := null; new.lived_on := null; end if;
  return new;
end $$;
revoke all on function private.bucket_item_revision() from public, anon, authenticated;

-- One day for a dream and its memory. Each side updates the other only when the day
-- actually differs, so the second trigger finds nothing to change and the pair stops.
-- security invoker: both updates pass the tables' own member policies.
create function private.sync_dream_lived_on()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'bucket_list_items' then
    if new.lived_on is not null and new.lived_on is distinct from old.lived_on then
      update public.memories set memory_date = new.lived_on
      where source_bucket_item_id = new.id and source_plan_id is null
        and couple_id = new.couple_id and memory_date is distinct from new.lived_on;
    end if;
  elsif new.source_bucket_item_id is not null and new.source_plan_id is null
    and (tg_op = 'INSERT' or new.memory_date is distinct from old.memory_date) then
    update public.bucket_list_items set lived_on = new.memory_date
    where id = new.source_bucket_item_id and couple_id = new.couple_id
      and status = 'completed' and lived_on is distinct from new.memory_date;
  end if;
  return null;
end $$;
revoke all on function private.sync_dream_lived_on() from public, anon, authenticated;
create trigger bucket_items_sync_lived_on after update on public.bucket_list_items
  for each row execute function private.sync_dream_lived_on();
create trigger memories_sync_lived_on after insert or update on public.memories
  for each row execute function private.sync_dream_lived_on();

create or replace view public.story_entries
with (security_invoker = on) as
  select 'milestone'::text as kind, milestone.id, milestone.couple_id, milestone.milestone_date as occurred_on,
         milestone.title, milestone.location, null::uuid as source_bucket_item_id, null::uuid as source_plan_id
  from public.milestones milestone
union all
  select 'memory', memory.id, memory.couple_id, memory.memory_date,
         memory.title, memory.location, memory.source_bucket_item_id, memory.source_plan_id
  from public.memories memory
union all
  -- Only a plan that actually happened belongs in a story, and only until a memory tells it.
  select 'plan', plan.id, plan.couple_id, (plan.starts_at at time zone plan.originating_timezone)::date,
         plan.title, plan.location, plan.source_bucket_item_id, null::uuid
  from public.plans plan
  where plan.status = 'completed'
    and not exists (select 1 from public.memories kept where kept.source_plan_id = plan.id)
union all
  select 'bucket', item.id, item.couple_id, item.lived_on,
         item.title, item.location, null::uuid, null::uuid
  from public.bucket_list_items item
  where item.status = 'completed' and item.lived_on is not null
    and not exists (select 1 from public.memories kept where kept.source_bucket_item_id = item.id);

comment on view public.story_entries is 'Shared relationship timeline over milestones, memories, completed plans and lived dreams. A plan or dream that a memory tells is represented by that memory alone. security_invoker, so table policies still decide every row. Notes and wishlists are structurally absent.';

-- Keyset pagination orders the dream branch by the day it was lived now.
drop index if exists public.bucket_items_couple_completed_story_idx;
create index bucket_items_couple_lived_story_idx on public.bucket_list_items (couple_id, lived_on desc, id desc)
  where status = 'completed';
