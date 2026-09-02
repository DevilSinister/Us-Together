-- Pairing lifecycle hardening. Public RPCs remain the narrow API surface while
-- privileged implementations live in the unexposed private schema.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

alter table public.couple_invitations
  add column attempt_count integer not null default 0 check (attempt_count >= 0),
  add column max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  add column last_attempt_at timestamptz;

create table private.pairing_attempt_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
revoke all on table private.pairing_attempt_limits from public, anon, authenticated;

create index couples_created_by_idx on public.couples (created_by);
create index couple_invitations_created_by_idx on public.couple_invitations (created_by);
create index couple_invitations_used_by_idx on public.couple_invitations (used_by) where used_by is not null;
create index bucket_lists_created_by_idx on public.bucket_lists (created_by);
create index bucket_items_completed_by_idx on public.bucket_list_items (completed_by) where completed_by is not null;
create index plan_reminders_plan_id_idx on public.plan_reminders (plan_id);
create index plans_completed_by_idx on public.plans (completed_by) where completed_by is not null;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_partner" on public.profiles;
create policy "profiles_select_self_or_partner"
on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or private.users_share_active_couple(user_id));

create function private.consume_pairing_attempt()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  attempt private.pairing_attempt_limits%rowtype;
begin
  if current_user_id is null then return false; end if;
  select * into attempt from private.pairing_attempt_limits
  where user_id = current_user_id for update;
  if attempt.user_id is null then
    insert into private.pairing_attempt_limits (user_id, attempt_count) values (current_user_id, 1);
    return true;
  end if;
  if attempt.blocked_until is not null and attempt.blocked_until > now() then
    update private.pairing_attempt_limits set updated_at = now() where user_id = current_user_id;
    return false;
  end if;
  if attempt.window_started_at <= now() - interval '10 minutes' then
    update private.pairing_attempt_limits
    set window_started_at = now(), attempt_count = 1, blocked_until = null, updated_at = now()
    where user_id = current_user_id;
    return true;
  end if;
  if attempt.attempt_count >= 5 then
    update private.pairing_attempt_limits
    set attempt_count = attempt_count + 1, blocked_until = now() + interval '15 minutes', updated_at = now()
    where user_id = current_user_id;
    return false;
  end if;
  update private.pairing_attempt_limits set attempt_count = attempt_count + 1, updated_at = now()
  where user_id = current_user_id;
  return true;
end;
$$;
revoke all on function private.consume_pairing_attempt() from public, anon, authenticated;

create function private.create_couple_with_invite(started_on date default null)
returns table (couple_id uuid, invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_couple_id uuid;
  plain_code text;
  code_number bigint;
  invitation_expiry timestamptz := now() + interval '30 minutes';
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if exists (
    select 1 from public.couple_memberships
    where user_id = current_user_id and left_at is null
  ) then
    raise exception using errcode = '23505', message = 'You already belong to a couple.';
  end if;

  insert into public.couples (created_by, relationship_started_on)
  values (current_user_id, started_on)
  returning id into created_couple_id;

  insert into public.couple_memberships (couple_id, user_id)
  values (created_couple_id, current_user_id);

  code_number := 100000 + ((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 900000);
  plain_code := code_number::text;

  insert into public.couple_invitations (couple_id, created_by, code_hash, expires_at)
  values (created_couple_id, current_user_id, extensions.digest(plain_code, 'sha256'), invitation_expiry);

  update public.profiles
  set relationship_started_on = started_on
  where user_id = current_user_id;

  return query select created_couple_id, plain_code, invitation_expiry;
end;
$$;

create function private.create_pairing_invite()
returns table (invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  active_couple_id uuid;
  plain_code text;
  code_number bigint;
  invitation_expiry timestamptz := now() + interval '30 minutes';
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select membership.couple_id into active_couple_id
  from public.couple_memberships membership
  where membership.user_id = current_user_id and membership.left_at is null;

  if active_couple_id is null then
    raise exception using errcode = '42501', message = 'Create a couple first.';
  end if;
  if exists (
    select 1 from public.couple_invitations invitation
    where invitation.created_by = current_user_id
      and invitation.created_at > now() - interval '1 minute'
  ) then
    raise exception using errcode = 'P0001', message = 'Wait a minute before creating another invite.';
  end if;

  update public.couple_invitations set revoked_at = now()
  where couple_id = active_couple_id and used_at is null and revoked_at is null;

  code_number := 100000 + ((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 900000);
  plain_code := code_number::text;

  insert into public.couple_invitations (couple_id, created_by, code_hash, expires_at)
  values (active_couple_id, current_user_id, extensions.digest(plain_code, 'sha256'), invitation_expiry);

  return query select plain_code, invitation_expiry;
end;
$$;

create function private.join_couple_by_code(pairing_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  matched_invitation public.couple_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if pairing_code !~ '^[0-9]{6}$' then
    return null;
  end if;
  if exists (
    select 1 from public.couple_memberships
    where user_id = current_user_id and left_at is null
  ) then
    raise exception using errcode = '23505', message = 'You already belong to a couple.';
  end if;
  if not private.consume_pairing_attempt() then
    return null;
  end if;

  select invitation.* into matched_invitation
  from public.couple_invitations invitation
  where invitation.code_hash = extensions.digest(pairing_code, 'sha256')
  for update;

  if matched_invitation.id is null then
    return null;
  end if;

  update public.couple_invitations
  set attempt_count = attempt_count + 1, last_attempt_at = now()
  where id = matched_invitation.id;

  if matched_invitation.used_at is not null
    or matched_invitation.revoked_at is not null
    or matched_invitation.expires_at <= now()
    or matched_invitation.attempt_count >= matched_invitation.max_attempts then
    return null;
  end if;

  insert into public.couple_memberships (couple_id, user_id)
  values (matched_invitation.couple_id, current_user_id);

  update public.couple_invitations
  set used_by = current_user_id, used_at = now()
  where id = matched_invitation.id;

  delete from private.pairing_attempt_limits where user_id = current_user_id;
  return matched_invitation.couple_id;
end;
$$;

create function private.revoke_pairing_invite()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  affected_count integer;
begin
  if current_user_id is null then return false; end if;
  update public.couple_invitations invitation
  set revoked_at = now()
  where invitation.created_by = current_user_id
    and invitation.used_at is null
    and invitation.revoked_at is null
    and private.is_active_couple_member(invitation.couple_id, current_user_id);
  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

create function private.leave_current_couple()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
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
  if active_count < 2 then return false; end if;

  update public.couple_memberships set left_at = now()
  where couple_id = active_couple_id and user_id = current_user_id and left_at is null;
  update public.couple_invitations set revoked_at = now()
  where couple_id = active_couple_id and used_at is null and revoked_at is null;
  update public.profiles set relationship_started_on = null where user_id = current_user_id;
  return true;
end;
$$;

create function private.delete_empty_couple()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
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
    or exists (select 1 from public.memories where couple_id = active_couple_id) then
    return false;
  end if;

  delete from public.couples where id = active_couple_id;
  update public.profiles set relationship_started_on = null where user_id = current_user_id;
  return true;
end;
$$;

revoke all on function
  private.create_couple_with_invite(date),
  private.create_pairing_invite(),
  private.join_couple_by_code(text),
  private.revoke_pairing_invite(),
  private.leave_current_couple(),
  private.delete_empty_couple()
from public, anon, authenticated;

grant execute on function
  private.create_couple_with_invite(date),
  private.create_pairing_invite(),
  private.join_couple_by_code(text),
  private.revoke_pairing_invite(),
  private.leave_current_couple(),
  private.delete_empty_couple()
to authenticated;

create or replace function public.create_couple_with_invite(started_on date default null)
returns table (couple_id uuid, invite_code text, expires_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_couple_with_invite(started_on);
$$;

create or replace function public.create_pairing_invite()
returns table (invite_code text, expires_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_pairing_invite();
$$;

create or replace function public.join_couple_by_code(pairing_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.join_couple_by_code(pairing_code);
$$;

create function public.revoke_pairing_invite()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_pairing_invite();
$$;

create function public.leave_current_couple()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.leave_current_couple();
$$;

create function public.delete_empty_couple()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.delete_empty_couple();
$$;

revoke all on function
  public.create_couple_with_invite(date),
  public.create_pairing_invite(),
  public.join_couple_by_code(text),
  public.revoke_pairing_invite(),
  public.leave_current_couple(),
  public.delete_empty_couple()
from public, anon, authenticated;

grant execute on function
  public.create_couple_with_invite(date),
  public.create_pairing_invite(),
  public.join_couple_by_code(text),
  public.revoke_pairing_invite(),
  public.leave_current_couple(),
  public.delete_empty_couple()
to authenticated;
