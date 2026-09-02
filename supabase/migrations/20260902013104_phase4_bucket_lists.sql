-- Versioned ideas, atomic child edits, and retry-safe conversion. No new definer RPCs.
-- Lists may only be deleted after explicitly moving/deleting their ideas.
alter table public.bucket_list_items drop constraint bucket_list_items_list_id_fkey;
alter table public.bucket_list_items add constraint bucket_list_items_list_id_fkey foreign key (list_id) references public.bucket_lists(id) on delete restrict;
create function public.delete_empty_bucket_list(target_list uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501', message='Sign in required.'; end if;
  perform 1 from public.bucket_lists where id=target_list for update;
  if not found then raise exception using errcode='P0002', message='List unavailable.'; end if;
  if exists(select 1 from public.bucket_list_items where list_id=target_list) then raise exception using errcode='23514', message='Move or delete this list''s ideas first.'; end if;
  delete from public.bucket_lists where id=target_list;
end $$;
revoke all on function public.delete_empty_bucket_list(uuid) from public,anon;
grant execute on function public.delete_empty_bucket_list(uuid) to authenticated;
create function private.limit_bucket_lists()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.couples where id=new.couple_id for update;
  if (select count(*) from public.bucket_lists where couple_id=new.couple_id) >= 100 then raise exception using errcode='23514', message='A space can have at most 100 lists.'; end if;
  return new;
end $$;
revoke all on function private.limit_bucket_lists() from public,anon,authenticated;
create trigger limit_bucket_lists before insert on public.bucket_lists for each row execute function private.limit_bucket_lists();
alter table public.bucket_list_items add column version integer not null default 0 check (version >= 0);
alter table public.bucket_item_subtasks drop constraint bucket_item_subtasks_item_id_position_key;
alter table public.bucket_item_subtasks add constraint bucket_subtask_position_unique unique (item_id, position) deferrable initially immediate;
create index bucket_items_couple_page_idx on public.bucket_list_items(couple_id, id desc);
create index bucket_items_filter_idx on public.bucket_list_items(couple_id, list_id, status, priority, id desc);
create index bucket_items_category_idx on public.bucket_list_items(couple_id, category, id desc);

create function private.bucket_item_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.version := old.version + 1; else new.version := 0; end if;
  if new.status = 'completed' then
    if tg_op = 'UPDATE' and old.status = 'completed' then
      new.completed_by := old.completed_by; new.completed_at := old.completed_at;
    else new.completed_by := auth.uid(); new.completed_at := now(); end if;
  else new.completed_by := null; new.completed_at := null; end if;
  return new;
end $$;
revoke all on function private.bucket_item_revision() from public, anon, authenticated;
create trigger bucket_item_revision before insert or update on public.bucket_list_items for each row execute function private.bucket_item_revision();

create function private.bucket_subtask_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target uuid;
begin
  if tg_op = 'UPDATE' and new.item_id <> old.item_id then
    raise exception using errcode='42501', message='Subtask parent cannot change.';
  end if;
  if tg_op = 'DELETE' then target := old.item_id; else target := new.item_id; end if;
  perform 1 from public.bucket_list_items where id=target for update;
  if tg_op = 'INSERT' and (select count(*) from public.bucket_item_subtasks where item_id=target) >= 50 then
    raise exception using errcode='23514', message='An idea can have at most 50 steps.';
  end if;
  update public.bucket_list_items set updated_at=now() where id=target;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.bucket_subtask_revision() from public, anon, authenticated;
create trigger bucket_subtask_revision before insert or update or delete on public.bucket_item_subtasks for each row execute function private.bucket_subtask_revision();

create function public.mutate_bucket_subtask(target_item uuid, expected_version integer, operation text, target_subtask uuid default null, task_label text default '', completed boolean default false, ordered_ids uuid[] default '{}')
returns void language plpgsql security invoker set search_path = '' as $$
declare current_version integer; task_count integer;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='Sign in required.'; end if;
  select version into current_version from public.bucket_list_items where id=target_item for update;
  if not found then raise exception using errcode='P0002', message='Idea unavailable.'; end if;
  if expected_version is null or current_version <> expected_version then raise exception using errcode='40001', message='This idea changed. Reload before saving.'; end if;
  if operation in ('add','update') and (task_label is null or char_length(trim(task_label)) not between 1 and 240) then
    raise exception using errcode='23514', message='Step label is required.';
  end if;
  if operation = 'add' then
    insert into public.bucket_item_subtasks(item_id,label,position) select target_item,trim(task_label),coalesce(max(position),-1)+1 from public.bucket_item_subtasks where item_id=target_item;
  elsif operation in ('update','delete') then
    perform 1 from public.bucket_item_subtasks where id=target_subtask and item_id=target_item;
    if not found then raise exception using errcode='P0002', message='Step unavailable.'; end if;
    if operation = 'update' then update public.bucket_item_subtasks set label=trim(task_label),is_completed=completed where id=target_subtask and item_id=target_item;
    else delete from public.bucket_item_subtasks where id=target_subtask and item_id=target_item; end if;
  elsif operation = 'reorder' then
    select count(*) into task_count from public.bucket_item_subtasks where item_id=target_item;
    if ordered_ids is null or cardinality(ordered_ids) <> task_count or (select count(distinct value) from unnest(ordered_ids) value) <> task_count
      or exists(select 1 from unnest(ordered_ids) value where not exists(select 1 from public.bucket_item_subtasks t where t.id=value and t.item_id=target_item)) then
      raise exception using errcode='23514', message='Reorder must contain every step exactly once.';
    end if;
    set constraints public.bucket_subtask_position_unique deferred;
    update public.bucket_item_subtasks task set position=ordering.ordinality-1 from unnest(ordered_ids) with ordinality ordering(id,ordinality) where task.id=ordering.id and task.item_id=target_item;
    set constraints public.bucket_subtask_position_unique immediate;
  else raise exception using errcode='23514', message='Unknown step operation.'; end if;
end $$;
revoke all on function public.mutate_bucket_subtask(uuid,integer,text,uuid,text,boolean,uuid[]) from public,anon;
grant execute on function public.mutate_bucket_subtask(uuid,integer,text,uuid,text,boolean,uuid[]) to authenticated;

create function public.create_plan_from_bucket(target_item uuid, plan_title text, plan_description text, plan_type text, start_time timestamptz, end_time timestamptz, timezone_name text, plan_location text, amount bigint, currency_code text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare source public.bucket_list_items; existing uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='Sign in required.'; end if;
  select * into source from public.bucket_list_items where id=target_item for update;
  if not found then raise exception using errcode='P0002', message='Idea unavailable.'; end if;
  select id into existing from public.plans where source_bucket_item_id=target_item and couple_id=source.couple_id;
  if found then return existing; end if;
  if source.status='completed' then raise exception using errcode='23514', message='This idea is already completed.'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=timezone_name) then raise exception using errcode='23514', message='Invalid timezone.'; end if;
  insert into public.plans(couple_id,source_bucket_item_id,title,description,type,starts_at,ends_at,originating_timezone,location,budget_minor,currency)
  values(source.couple_id,source.id,plan_title,plan_description,plan_type,start_time,end_time,timezone_name,plan_location,amount,currency_code) returning id into existing;
  update public.bucket_list_items set status='planned' where id=source.id;
  return existing;
end $$;
revoke all on function public.create_plan_from_bucket(uuid,text,text,text,timestamptz,timestamptz,text,text,bigint,text) from public,anon;
grant execute on function public.create_plan_from_bucket(uuid,text,text,text,timestamptz,timestamptz,text,text,bigint,text) to authenticated;

create unique index memories_one_per_direct_bucket_source on public.memories(couple_id,source_bucket_item_id) where source_bucket_item_id is not null and source_plan_id is null;
create function public.create_memory_from_bucket(target_item uuid, memory_title text, story text, happened_on date, memory_location text, feeling smallint, favorite boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare source public.bucket_list_items; existing uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='Sign in required.'; end if;
  select * into source from public.bucket_list_items where id=target_item for update;
  if not found then raise exception using errcode='P0002', message='Idea unavailable.'; end if;
  if source.status <> 'completed' then raise exception using errcode='23514', message='Complete the idea first.'; end if;
  select id into existing from public.memories where source_bucket_item_id=target_item and source_plan_id is null and couple_id=source.couple_id;
  if found then return existing; end if;
  insert into public.memories(couple_id,source_bucket_item_id,title,description,memory_date,location,rating,is_favorite)
  values(source.couple_id,source.id,memory_title,story,happened_on,memory_location,feeling,favorite) returning id into existing;
  return existing;
end $$;
revoke all on function public.create_memory_from_bucket(uuid,text,text,date,text,smallint,boolean) from public,anon;
grant execute on function public.create_memory_from_bucket(uuid,text,text,date,text,smallint,boolean) to authenticated;
