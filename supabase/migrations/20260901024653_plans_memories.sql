-- plans and memories migration
create or replace function private.is_active_couple_member(target_couple_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and target_user_id = (select auth.uid())
    and exists (
      select 1 from public.couple_memberships membership
      where membership.couple_id = target_couple_id
        and membership.user_id = (select auth.uid())
        and membership.left_at is null
    );
$$;

create table public.bucket_lists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  list_id uuid not null references public.bucket_lists (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 4000),
  category text check (category is null or char_length(category) between 1 and 80),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'dream')),
  estimated_cost_minor bigint check (estimated_cost_minor is null or estimated_cost_minor >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  target_date date,
  location text check (location is null or char_length(location) <= 240),
  status text not null default 'idea' check (status in ('idea', 'planned', 'in_progress', 'completed')),
  completed_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bucket_item_completion_complete check ((completed_by is null) = (completed_at is null)),
  constraint bucket_item_currency_complete check ((estimated_cost_minor is null) = (currency is null))
);

create table public.bucket_item_subtasks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.bucket_list_items (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 240),
  is_completed boolean not null default false,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, position)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  source_bucket_item_id uuid references public.bucket_list_items (id) on delete set null,
  type text not null check (type in ('date', 'trip', 'activity', 'birthday', 'anniversary', 'event', 'reminder', 'other')),
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 8000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  originating_timezone text not null check (char_length(originating_timezone) between 1 and 64),
  location text check (location is null or char_length(location) <= 240),
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  external_map_url text check (external_map_url is null or external_map_url ~ '^https://'),
  budget_minor bigint check (budget_minor is null or budget_minor >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  completed_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_interval_valid check (ends_at is null or ends_at >= starts_at),
  constraint plan_coordinates_complete check ((latitude is null) = (longitude is null)),
  constraint plan_budget_complete check ((budget_minor is null) = (currency is null)),
  constraint plan_completion_complete check ((completed_by is null) = (completed_at is null))
);

create unique index plans_one_per_bucket_source on public.plans (couple_id, source_bucket_item_id) where source_bucket_item_id is not null;

create table public.plan_checklist_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 240),
  is_completed boolean not null default false,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, position)
);

create table public.plan_reminders (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  due_at timestamptz not null,
  channel text not null default 'in_app' check (channel = 'in_app'),
  state text not null default 'pending' check (state in ('pending', 'processing', 'delivered', 'cancelled', 'failed')),
  delivery_key uuid not null default gen_random_uuid() unique,
  attempts integer not null default 0 check (attempts >= 0),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  source_bucket_item_id uuid references public.bucket_list_items (id) on delete set null,
  source_plan_id uuid references public.plans (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 12000),
  memory_date date not null,
  location text check (location is null or char_length(location) <= 240),
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  rating smallint check (rating is null or rating between 1 and 5),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_coordinates_complete check ((latitude is null) = (longitude is null))
);

create unique index memories_one_per_plan_source on public.memories (couple_id, source_plan_id) where source_plan_id is not null;

create table public.memory_tags (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  created_at timestamptz not null default now(),
  unique (couple_id, name)
);

create table public.memory_tag_links (
  memory_id uuid not null references public.memories (id) on delete cascade,
  tag_id uuid not null references public.memory_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, tag_id)
);

create table public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(10,3) check (duration_seconds is null or duration_seconds > 0),
  derivative_path text unique,
  created_at timestamptz not null default now()
);

create index bucket_lists_couple_created_idx on public.bucket_lists (couple_id, created_at desc, id);
create index bucket_items_list_status_idx on public.bucket_list_items (list_id, status, created_at desc, id);
create index bucket_items_couple_idx on public.bucket_list_items (couple_id);
create index bucket_items_creator_idx on public.bucket_list_items (created_by);
create index bucket_subtasks_item_idx on public.bucket_item_subtasks (item_id);
create index plans_couple_start_idx on public.plans (couple_id, starts_at, id);
create index plans_couple_upcoming_idx on public.plans (couple_id, starts_at, id) where status = 'planned';
create index plans_creator_idx on public.plans (created_by);
create index plans_source_bucket_idx on public.plans (source_bucket_item_id);
create index plan_checklist_plan_idx on public.plan_checklist_items (plan_id);
create index plan_reminders_due_idx on public.plan_reminders (due_at, id) where state = 'pending';
create index plan_reminders_creator_idx on public.plan_reminders (created_by);
create index memories_couple_date_idx on public.memories (couple_id, memory_date desc, id desc);
create index memories_couple_favorite_idx on public.memories (couple_id, memory_date desc, id desc) where is_favorite;
create index memories_creator_idx on public.memories (created_by);
create index memories_source_bucket_idx on public.memories (source_bucket_item_id);
create index memories_source_plan_idx on public.memories (source_plan_id);
create index memory_tags_couple_idx on public.memory_tags (couple_id);
create index memory_tag_links_tag_idx on public.memory_tag_links (tag_id);
create index memory_media_memory_idx on public.memory_media (memory_id, created_at, id);
create index memory_media_creator_idx on public.memory_media (created_by);

comment on table public.plans is 'Couple-owned scheduled experiences with optional durable bucket provenance.';
comment on table public.memories is 'Couple-owned stories with optional bucket and plan provenance.';
comment on table public.memory_media is 'Metadata for private Storage objects; binary content never lives in PostgreSQL.';

alter table public.bucket_lists enable row level security;
alter table public.bucket_lists force row level security;
alter table public.bucket_list_items enable row level security;
alter table public.bucket_list_items force row level security;
alter table public.bucket_item_subtasks enable row level security;
alter table public.bucket_item_subtasks force row level security;
alter table public.plans enable row level security;
alter table public.plans force row level security;
alter table public.plan_checklist_items enable row level security;
alter table public.plan_checklist_items force row level security;
alter table public.plan_reminders enable row level security;
alter table public.plan_reminders force row level security;
alter table public.memories enable row level security;
alter table public.memories force row level security;
alter table public.memory_tags enable row level security;
alter table public.memory_tags force row level security;
alter table public.memory_tag_links enable row level security;
alter table public.memory_tag_links force row level security;
alter table public.memory_media enable row level security;
alter table public.memory_media force row level security;

revoke all on table public.bucket_lists, public.bucket_list_items, public.bucket_item_subtasks, public.plans, public.plan_checklist_items, public.plan_reminders, public.memories, public.memory_tags, public.memory_tag_links, public.memory_media from anon, authenticated;
grant select, insert, update, delete on table public.bucket_lists, public.bucket_list_items, public.bucket_item_subtasks, public.plans, public.plan_checklist_items, public.plan_reminders, public.memories, public.memory_tags, public.memory_tag_links, public.memory_media to authenticated;

create function private.plan_couple(target_plan_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select couple_id from public.plans where id = target_plan_id and (select auth.uid()) is not null and private.is_active_couple_member(couple_id) $$;

create function private.memory_couple(target_memory_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select couple_id from public.memories where id = target_memory_id and (select auth.uid()) is not null and private.is_active_couple_member(couple_id) $$;

create function private.bucket_item_couple(target_item_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select couple_id from public.bucket_list_items where id = target_item_id and (select auth.uid()) is not null and private.is_active_couple_member(couple_id) $$;

revoke all on function private.plan_couple(uuid), private.memory_couple(uuid), private.bucket_item_couple(uuid) from public, anon, authenticated;
grant execute on function private.plan_couple(uuid), private.memory_couple(uuid), private.bucket_item_couple(uuid) to authenticated;

create policy "bucket_lists_select_member" on public.bucket_lists for select to authenticated using (private.is_active_couple_member(couple_id));
create policy "bucket_lists_insert_member" on public.bucket_lists for insert to authenticated with check (private.is_active_couple_member(couple_id) and created_by = (select auth.uid()));
create policy "bucket_lists_update_member" on public.bucket_lists for update to authenticated using (private.is_active_couple_member(couple_id)) with check (private.is_active_couple_member(couple_id));
create policy "bucket_lists_delete_member" on public.bucket_lists for delete to authenticated using (private.is_active_couple_member(couple_id));

create policy "bucket_items_select_member" on public.bucket_list_items for select to authenticated using (private.is_active_couple_member(couple_id));
create policy "bucket_items_insert_member" on public.bucket_list_items for insert to authenticated with check (private.is_active_couple_member(couple_id) and created_by = (select auth.uid()));
create policy "bucket_items_update_member" on public.bucket_list_items for update to authenticated using (private.is_active_couple_member(couple_id)) with check (private.is_active_couple_member(couple_id));
create policy "bucket_items_delete_member" on public.bucket_list_items for delete to authenticated using (private.is_active_couple_member(couple_id));

create policy "bucket_subtasks_select_member" on public.bucket_item_subtasks for select to authenticated using (private.is_active_couple_member(private.bucket_item_couple(item_id)));
create policy "bucket_subtasks_insert_member" on public.bucket_item_subtasks for insert to authenticated with check (private.is_active_couple_member(private.bucket_item_couple(item_id)));
create policy "bucket_subtasks_update_member" on public.bucket_item_subtasks for update to authenticated using (private.is_active_couple_member(private.bucket_item_couple(item_id))) with check (private.is_active_couple_member(private.bucket_item_couple(item_id)));
create policy "bucket_subtasks_delete_member" on public.bucket_item_subtasks for delete to authenticated using (private.is_active_couple_member(private.bucket_item_couple(item_id)));

create policy "plans_select_member" on public.plans for select to authenticated using (private.is_active_couple_member(couple_id));
create policy "plans_insert_member" on public.plans for insert to authenticated with check (private.is_active_couple_member(couple_id) and created_by = (select auth.uid()));
create policy "plans_update_member" on public.plans for update to authenticated using (private.is_active_couple_member(couple_id)) with check (private.is_active_couple_member(couple_id));
create policy "plans_delete_member" on public.plans for delete to authenticated using (private.is_active_couple_member(couple_id));

create policy "plan_checklist_select_member" on public.plan_checklist_items for select to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_checklist_insert_member" on public.plan_checklist_items for insert to authenticated with check (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_checklist_update_member" on public.plan_checklist_items for update to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id))) with check (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_checklist_delete_member" on public.plan_checklist_items for delete to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id)));

create policy "plan_reminders_select_member" on public.plan_reminders for select to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_reminders_insert_member" on public.plan_reminders for insert to authenticated with check (private.is_active_couple_member(private.plan_couple(plan_id)) and created_by = (select auth.uid()));
create policy "plan_reminders_update_member" on public.plan_reminders for update to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id))) with check (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_reminders_delete_member" on public.plan_reminders for delete to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id)));

create policy "memories_select_member" on public.memories for select to authenticated using (private.is_active_couple_member(couple_id));
create policy "memories_insert_member" on public.memories for insert to authenticated with check (private.is_active_couple_member(couple_id) and created_by = (select auth.uid()));
create policy "memories_update_member" on public.memories for update to authenticated using (private.is_active_couple_member(couple_id)) with check (private.is_active_couple_member(couple_id));
create policy "memories_delete_member" on public.memories for delete to authenticated using (private.is_active_couple_member(couple_id));

create policy "memory_tags_select_member" on public.memory_tags for select to authenticated using (private.is_active_couple_member(couple_id));
create policy "memory_tags_insert_member" on public.memory_tags for insert to authenticated with check (private.is_active_couple_member(couple_id));
create policy "memory_tags_update_member" on public.memory_tags for update to authenticated using (private.is_active_couple_member(couple_id)) with check (private.is_active_couple_member(couple_id));
create policy "memory_tags_delete_member" on public.memory_tags for delete to authenticated using (private.is_active_couple_member(couple_id));

create policy "memory_tag_links_select_member" on public.memory_tag_links for select to authenticated using (private.is_active_couple_member(private.memory_couple(memory_id)));
create policy "memory_tag_links_insert_member" on public.memory_tag_links for insert to authenticated with check (private.is_active_couple_member(private.memory_couple(memory_id)));
create policy "memory_tag_links_delete_member" on public.memory_tag_links for delete to authenticated using (private.is_active_couple_member(private.memory_couple(memory_id)));

create policy "memory_media_select_member" on public.memory_media for select to authenticated using (private.is_active_couple_member(private.memory_couple(memory_id)));
create policy "memory_media_insert_member" on public.memory_media for insert to authenticated with check (private.is_active_couple_member(private.memory_couple(memory_id)) and created_by = (select auth.uid()));
create policy "memory_media_update_member" on public.memory_media for update to authenticated using (private.is_active_couple_member(private.memory_couple(memory_id))) with check (private.is_active_couple_member(private.memory_couple(memory_id)));
create policy "memory_media_delete_member" on public.memory_media for delete to authenticated using (private.is_active_couple_member(private.memory_couple(memory_id)));

create function private.validate_plan_tenant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.couple_id <> old.couple_id or new.created_by <> old.created_by) then
    raise exception using errcode = '42501', message = 'Plan ownership cannot be changed.';
  end if;
  if new.source_bucket_item_id is not null and not exists (
    select 1 from public.bucket_list_items item where item.id = new.source_bucket_item_id and item.couple_id = new.couple_id
  ) then
    raise exception using errcode = '23514', message = 'Plan source must belong to the same couple.';
  end if;
  return new;
end;
$$;

create function private.validate_bucket_tenant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'bucket_lists' then
    if tg_op = 'UPDATE' and (new.couple_id <> old.couple_id or new.created_by <> old.created_by) then
      raise exception using errcode = '42501', message = 'Bucket-list ownership cannot be changed.';
    end if;
  elsif tg_table_name = 'bucket_list_items' then
    if tg_op = 'UPDATE' and (new.couple_id <> old.couple_id or new.created_by <> old.created_by) then
      raise exception using errcode = '42501', message = 'Bucket-item ownership cannot be changed.';
    end if;
    if not exists (select 1 from public.bucket_lists list where list.id = new.list_id and list.couple_id = new.couple_id) then
      raise exception using errcode = '23514', message = 'Bucket item and list must belong to the same couple.';
    end if;
  end if;
  return new;
end;
$$;

create function private.validate_memory_tenant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.couple_id <> old.couple_id or new.created_by <> old.created_by) then
    raise exception using errcode = '42501', message = 'Memory ownership cannot be changed.';
  end if;
  if new.source_bucket_item_id is not null and not exists (
    select 1 from public.bucket_list_items item where item.id = new.source_bucket_item_id and item.couple_id = new.couple_id
  ) then
    raise exception using errcode = '23514', message = 'Memory bucket source must belong to the same couple.';
  end if;
  if new.source_plan_id is not null and not exists (
    select 1 from public.plans plan where plan.id = new.source_plan_id and plan.couple_id = new.couple_id
  ) then
    raise exception using errcode = '23514', message = 'Memory plan source must belong to the same couple.';
  end if;
  return new;
end;
$$;

create function private.validate_memory_tag_link()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.memories memory
    join public.memory_tags tag on tag.id = new.tag_id and tag.couple_id = memory.couple_id
    where memory.id = new.memory_id
  ) then
    raise exception using errcode = '23514', message = 'Memory and tag must belong to the same couple.';
  end if;
  return new;
end;
$$;

create function private.validate_memory_media_path()
returns trigger language plpgsql set search_path = '' as $$
declare
  memory_couple_id uuid;
  path_parts text[];
begin
  select couple_id into memory_couple_id from public.memories where id = new.memory_id;
  path_parts := string_to_array(new.storage_path, '/');
  if array_length(path_parts, 1) < 3 or path_parts[1] <> memory_couple_id::text or path_parts[2] <> new.memory_id::text then
    raise exception using errcode = '23514', message = 'Media path must match its couple and memory.';
  end if;
  if tg_op = 'UPDATE' and (new.memory_id <> old.memory_id or new.created_by <> old.created_by) then
    raise exception using errcode = '42501', message = 'Media ownership cannot be changed.';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_plan_tenant(), private.validate_bucket_tenant(), private.validate_memory_tenant(), private.validate_memory_tag_link(), private.validate_memory_media_path() from public, anon, authenticated;
create trigger bucket_lists_validate_tenant before insert or update on public.bucket_lists for each row execute function private.validate_bucket_tenant();
create trigger bucket_items_validate_tenant before insert or update on public.bucket_list_items for each row execute function private.validate_bucket_tenant();
create trigger plans_validate_tenant before insert or update on public.plans for each row execute function private.validate_plan_tenant();
create trigger memories_validate_tenant before insert or update on public.memories for each row execute function private.validate_memory_tenant();
create trigger memory_tag_links_validate_tenant before insert or update on public.memory_tag_links for each row execute function private.validate_memory_tag_link();
create trigger memory_media_validate_path before insert or update on public.memory_media for each row execute function private.validate_memory_media_path();

create trigger bucket_lists_set_updated_at before update on public.bucket_lists for each row execute function private.set_updated_at();
create trigger bucket_items_set_updated_at before update on public.bucket_list_items for each row execute function private.set_updated_at();
create trigger bucket_subtasks_set_updated_at before update on public.bucket_item_subtasks for each row execute function private.set_updated_at();
create trigger plans_set_updated_at before update on public.plans for each row execute function private.set_updated_at();
create trigger plan_checklist_set_updated_at before update on public.plan_checklist_items for each row execute function private.set_updated_at();
create trigger plan_reminders_set_updated_at before update on public.plan_reminders for each row execute function private.set_updated_at();
create trigger memories_set_updated_at before update on public.memories for each row execute function private.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-media', 'memory-media', false, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function private.can_access_memory_object(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  path_parts text[];
  path_couple_id uuid;
  path_memory_id uuid;
begin
  if auth.uid() is null then return false; end if;
  path_parts := storage.foldername(object_name);
  if array_length(path_parts, 1) < 2 then return false; end if;
  begin
    path_couple_id := path_parts[1]::uuid;
    path_memory_id := path_parts[2]::uuid;
  exception when invalid_text_representation then return false;
  end;
  return exists (
    select 1 from public.memories memory
    where memory.id = path_memory_id
      and memory.couple_id = path_couple_id
      and private.is_active_couple_member(memory.couple_id)
  );
end;
$$;

revoke all on function private.can_access_memory_object(text) from public, anon, authenticated;
grant execute on function private.can_access_memory_object(text) to authenticated;

create policy "memory_objects_select_member" on storage.objects for select to authenticated
  using (bucket_id = 'memory-media' and private.can_access_memory_object(name));
create policy "memory_objects_insert_member" on storage.objects for insert to authenticated
  with check (bucket_id = 'memory-media' and private.can_access_memory_object(name));
create policy "memory_objects_update_member" on storage.objects for update to authenticated
  using (bucket_id = 'memory-media' and private.can_access_memory_object(name))
  with check (bucket_id = 'memory-media' and private.can_access_memory_object(name));
create policy "memory_objects_delete_member" on storage.objects for delete to authenticated
  using (bucket_id = 'memory-media' and private.can_access_memory_object(name));
