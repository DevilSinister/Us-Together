alter table public.profiles
  add column if not exists relationship_started_on date;

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete restrict,
  relationship_started_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.couple_memberships (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint membership_dates_valid check (left_at is null or left_at >= joined_at)
);

create unique index couple_memberships_one_active_couple_per_user
  on public.couple_memberships (user_id)
  where left_at is null;

create unique index couple_memberships_one_active_membership
  on public.couple_memberships (couple_id, user_id)
  where left_at is null;

create index couple_memberships_active_couple_lookup
  on public.couple_memberships (couple_id, joined_at)
  where left_at is null;

create table public.couple_invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  code_hash bytea not null unique,
  expires_at timestamptz not null,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitation_expiry_after_creation check (expires_at > created_at),
  constraint invitation_use_complete check ((used_by is null) = (used_at is null))
);

create index couple_invitations_active_lookup
  on public.couple_invitations (couple_id, expires_at)
  where used_at is null and revoked_at is null;

comment on table public.couples is 'A tenant boundary initially limited to exactly two active partners.';
comment on table public.couple_memberships is 'User membership in one couple; partial indexes enforce one active couple per user.';
comment on table public.couple_invitations is 'Single-use pairing codes stored only as SHA-256 hashes.';

alter table public.couples enable row level security;
alter table public.couples force row level security;
alter table public.couple_memberships enable row level security;
alter table public.couple_memberships force row level security;
alter table public.couple_invitations enable row level security;
alter table public.couple_invitations force row level security;

revoke all on table public.couples, public.couple_memberships, public.couple_invitations from anon, authenticated;
grant select on table public.couples, public.couple_memberships to authenticated;

create function private.is_active_couple_member(target_couple_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = target_couple_id
      and membership.user_id = target_user_id
      and membership.left_at is null
  );
$$;

create function private.users_share_active_couple(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_memberships mine
    join public.couple_memberships theirs on theirs.couple_id = mine.couple_id
    where mine.user_id = auth.uid()
      and mine.left_at is null
      and theirs.user_id = other_user_id
      and theirs.left_at is null
  );
$$;

revoke all on function private.is_active_couple_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.users_share_active_couple(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_couple_member(uuid, uuid), private.users_share_active_couple(uuid) to authenticated;

create policy "couples_select_member"
on public.couples for select to authenticated
using (private.is_active_couple_member(id));

create policy "memberships_select_couple"
on public.couple_memberships for select to authenticated
using (private.is_active_couple_member(couple_id));

create policy "profiles_select_partner"
on public.profiles for select to authenticated
using (private.users_share_active_couple(user_id));

create function private.enforce_two_active_partners()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
begin
  perform 1 from public.couples where id = new.couple_id for update;
  select count(*) into active_count
  from public.couple_memberships
  where couple_id = new.couple_id and left_at is null;

  if active_count >= 2 then
    raise exception using errcode = '23514', message = 'This couple already has two active partners.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_two_active_partners() from public, anon, authenticated;

create trigger couple_memberships_enforce_capacity
before insert on public.couple_memberships
for each row execute function private.enforce_two_active_partners();

create trigger couples_set_updated_at
before update on public.couples
for each row execute function private.set_updated_at();

create function public.create_couple_with_invite(started_on date default null)
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
  if exists (select 1 from public.couple_memberships where user_id = current_user_id and left_at is null) then
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

create function public.create_pairing_invite()
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
  select membership.couple_id into active_couple_id
  from public.couple_memberships membership
  where membership.user_id = current_user_id and membership.left_at is null;

  if active_couple_id is null then
    raise exception using errcode = '42501', message = 'Create a couple first.';
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

create function public.join_couple_by_code(pairing_code text)
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
    raise exception using errcode = '22023', message = 'Enter a six-digit code.';
  end if;
  if exists (select 1 from public.couple_memberships where user_id = current_user_id and left_at is null) then
    raise exception using errcode = '23505', message = 'You already belong to a couple.';
  end if;

  select invitation.* into matched_invitation
  from public.couple_invitations invitation
  where invitation.code_hash = extensions.digest(pairing_code, 'sha256')
    and invitation.used_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
  for update;

  if matched_invitation.id is null then
    raise exception using errcode = '22023', message = 'That pairing code is invalid or expired.';
  end if;

  insert into public.couple_memberships (couple_id, user_id)
  values (matched_invitation.couple_id, current_user_id);

  update public.couple_invitations
  set used_by = current_user_id, used_at = now()
  where id = matched_invitation.id;

  return matched_invitation.couple_id;
end;
$$;

revoke all on function public.create_couple_with_invite(date), public.create_pairing_invite(), public.join_couple_by_code(text) from public, anon, authenticated;
grant execute on function public.create_couple_with_invite(date), public.create_pairing_invite(), public.join_couple_by_code(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars_select_own"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_delete_own"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
