-- Phase 3 dashboard foundations: couple milestones plus recipient-owned,
-- content-minimal in-app notifications and preferences.

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  type text not null check (type in ('relationship', 'birthday', 'anniversary', 'travel', 'achievement', 'custom')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  milestone_date date not null,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  in_app_enabled boolean not null default true,
  plans_enabled boolean not null default true,
  memories_enabled boolean not null default true,
  milestones_enabled boolean not null default true,
  notes_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  couple_id uuid references public.couples (id) on delete cascade,
  category text not null check (category in ('plan', 'memory', 'milestone', 'note', 'system')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  target_type text check (target_type is null or target_type in ('plan', 'memory', 'milestone', 'note')),
  target_id uuid,
  read_at timestamptz,
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 180),
  created_at timestamptz not null default now(),
  constraint notifications_target_complete check ((target_type is null) = (target_id is null))
);

create index milestones_couple_date_idx on public.milestones (couple_id, milestone_date desc, id desc);
create index milestones_creator_idx on public.milestones (created_by);
create index milestones_featured_idx on public.milestones (couple_id, milestone_date desc, id desc) where is_featured;
create index notifications_recipient_unread_idx on public.notifications (recipient_id, created_at desc, id desc) where read_at is null;
create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc, id desc);
create index notifications_couple_idx on public.notifications (couple_id) where couple_id is not null;
create index notifications_target_idx on public.notifications (target_type, target_id) where target_id is not null;

comment on table public.milestones is 'Couple-owned dated moments eligible for privacy-safe dashboard projection.';
comment on table public.notifications is 'Recipient-owned, content-minimal in-app notification envelopes; shared titles and bodies are never copied here.';
comment on table public.notification_preferences is 'User-owned in-app notification category controls.';

alter table public.milestones enable row level security;
alter table public.milestones force row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

revoke all on table public.milestones, public.notification_preferences, public.notifications from public, anon, authenticated;
grant select, insert, update, delete on table public.milestones to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
grant select, update, delete on table public.notifications to authenticated;

create policy "milestones_select_member" on public.milestones for select to authenticated
  using ((select private.is_active_couple_member(couple_id)));
create policy "milestones_insert_member" on public.milestones for insert to authenticated
  with check ((select private.is_active_couple_member(couple_id)) and created_by = (select auth.uid()));
create policy "milestones_update_member" on public.milestones for update to authenticated
  using ((select private.is_active_couple_member(couple_id)))
  with check ((select private.is_active_couple_member(couple_id)) and created_by = (select auth.uid()));
create policy "milestones_delete_member" on public.milestones for delete to authenticated
  using ((select private.is_active_couple_member(couple_id)));

create policy "notification_preferences_select_own" on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notification_preferences_insert_own" on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "notification_preferences_update_own" on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_select_recipient" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and (couple_id is null or (select private.is_active_couple_member(couple_id))));
create policy "notifications_update_recipient" on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()) and (couple_id is null or (select private.is_active_couple_member(couple_id))))
  with check (recipient_id = (select auth.uid()) and (couple_id is null or (select private.is_active_couple_member(couple_id))));
create policy "notifications_delete_recipient" on public.notifications for delete to authenticated
  using (recipient_id = (select auth.uid()) and (couple_id is null or (select private.is_active_couple_member(couple_id))));

create function private.validate_milestone_tenant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.couple_id <> old.couple_id or new.created_by <> old.created_by) then
    raise exception using errcode = '42501', message = 'Milestone ownership cannot be changed.';
  end if;
  new.title := btrim(new.title);
  return new;
end;
$$;

create function private.validate_notification_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.recipient_id <> old.recipient_id
    or new.couple_id is distinct from old.couple_id
    or new.category <> old.category
    or new.title <> old.title
    or new.target_type is distinct from old.target_type
    or new.target_id is distinct from old.target_id
    or new.idempotency_key <> old.idempotency_key
    or new.created_at <> old.created_at then
    raise exception using errcode = '42501', message = 'Only notification read state can be changed.';
  end if;
  return new;
end;
$$;

create function private.handle_new_notification_preferences()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create function private.notify_milestone_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, couple_id, category, title, target_type, target_id, idempotency_key)
  select membership.user_id, new.couple_id, 'milestone', 'A milestone was added', 'milestone', new.id,
    'milestone:' || new.id::text || ':' || membership.user_id::text
  from public.couple_memberships membership
  left join public.notification_preferences preference on preference.user_id = membership.user_id
  where membership.couple_id = new.couple_id
    and membership.left_at is null
    and membership.user_id <> new.created_by
    and coalesce(preference.in_app_enabled, true)
    and coalesce(preference.milestones_enabled, true)
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create function private.delete_milestone_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where target_type = 'milestone' and target_id = old.id;
  return old;
end;
$$;

revoke all on function private.validate_milestone_tenant(), private.validate_notification_update(), private.handle_new_notification_preferences(), private.notify_milestone_created(), private.delete_milestone_notifications() from public, anon, authenticated;

create trigger milestones_validate_tenant before insert or update on public.milestones for each row execute function private.validate_milestone_tenant();
create trigger milestones_set_updated_at before update on public.milestones for each row execute function private.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function private.set_updated_at();
create trigger notifications_validate_update before update on public.notifications for each row execute function private.validate_notification_update();
create trigger milestones_notify_partner after insert on public.milestones for each row execute function private.notify_milestone_created();
create trigger milestones_delete_notifications after delete on public.milestones for each row execute function private.delete_milestone_notifications();
create trigger auth_user_notification_preferences after insert on auth.users for each row execute function private.handle_new_notification_preferences();

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function private.delete_empty_couple()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  active_couple_id uuid;
  active_count integer;
begin
  if current_user_id is null then return false; end if;
  select membership.couple_id into active_couple_id
  from public.couple_memberships membership
  where membership.user_id = current_user_id and membership.left_at is null
  for update;
  if active_couple_id is null then return false; end if;

  perform 1 from public.couples where id = active_couple_id for update;
  select count(*) into active_count from public.couple_memberships
  where couple_id = active_couple_id and left_at is null;
  if active_count <> 1 then return false; end if;
  if exists (select 1 from public.bucket_lists where couple_id = active_couple_id)
    or exists (select 1 from public.plans where couple_id = active_couple_id)
    or exists (select 1 from public.memories where couple_id = active_couple_id)
    or exists (select 1 from public.milestones where couple_id = active_couple_id) then
    return false;
  end if;

  delete from public.couples where id = active_couple_id;
  update public.profiles set relationship_started_on = null where user_id = current_user_id;
  return true;
end;
$$;

revoke all on function private.delete_empty_couple() from public, anon, authenticated;
grant execute on function private.delete_empty_couple() to authenticated;
