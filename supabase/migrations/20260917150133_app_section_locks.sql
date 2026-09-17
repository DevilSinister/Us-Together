-- Per-user content locks. Browser device unlock releases the code to the same
-- server-verified RPC; RLS is the enforcement boundary for every selected area.
create table private.app_lock_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
create table private.app_lock_areas (
  user_id uuid not null references private.app_lock_codes(user_id) on delete cascade,
  area text not null check (area in ('gallery','memories','moments','plans','bucket','notes','drawings','wishlist','notifications')),
  primary key(user_id,area)
);
create table private.app_lock_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  area text not null check (area in ('gallery','memories','moments','plans','bucket','notes','drawings','wishlist','notifications')),
  expires_at timestamptz not null,
  primary key(user_id,session_id,area)
);
create index app_lock_unlocks_expiry_idx on private.app_lock_unlocks(expires_at);
revoke all on private.app_lock_codes,private.app_lock_areas,private.app_lock_unlocks from public,anon,authenticated;

create function private.app_lock_open(requested_area text)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and requested_area in
    ('gallery','memories','moments','plans','bucket','notes','drawings','wishlist','notifications') and (
    not exists(select 1 from private.app_lock_areas a where a.user_id=(select auth.uid()) and a.area=requested_area)
    or exists(select 1 from private.app_lock_unlocks u
      where u.user_id=(select auth.uid()) and u.area=requested_area
        and u.session_id=nullif((select auth.jwt()->>'session_id'),'')::uuid
        and u.expires_at>now())
  );
$$;
revoke all on function private.app_lock_open(text) from public,anon,authenticated;
grant execute on function private.app_lock_open(text) to authenticated;

create function private.app_lock_check_code(requested_code text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare current_lock private.app_lock_codes;
begin
  if auth.uid() is null or requested_code is null then return false; end if;
  select * into current_lock from private.app_lock_codes where user_id=auth.uid() for update;
  if not found or coalesce(current_lock.blocked_until>now(),false) then return false; end if;
  if extensions.crypt(requested_code,current_lock.code_hash)=current_lock.code_hash then
    update private.app_lock_codes set failed_attempts=0,blocked_until=null where user_id=auth.uid();
    return true;
  end if;
  update private.app_lock_codes
    set failed_attempts=least(failed_attempts+1,5),
        blocked_until=case when failed_attempts>=4 then now()+interval '15 minutes' else null end
    where user_id=auth.uid();
  return false;
end $$;
revoke all on function private.app_lock_check_code(text) from public,anon,authenticated;

create function private.app_lock_configure(requested_code text, requested_areas text[])
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare normalized text[];
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  if requested_code !~ '^[0-9]{6,12}$' then raise exception 'Use a 6-12 digit code.' using errcode='22023'; end if;
  if requested_areas is null or exists(select 1 from unnest(requested_areas) a where a is null or a not in
    ('gallery','memories','moments','plans','bucket','notes','drawings','wishlist','notifications')) then
    raise exception 'Unknown area.' using errcode='22023'; end if;
  select coalesce(array_agg(distinct a),'{}'::text[]) into normalized from unnest(requested_areas) a;
  insert into private.app_lock_codes(user_id,code_hash)
    values(auth.uid(),extensions.crypt(requested_code,extensions.gen_salt('bf',12)))
    on conflict(user_id) do nothing;
  if not private.app_lock_check_code(requested_code) then return false; end if;
  delete from private.app_lock_areas where user_id=auth.uid();
  insert into private.app_lock_areas(user_id,area) select auth.uid(),unnest(normalized);
  delete from private.app_lock_unlocks where user_id=auth.uid();
  return true;
end $$;
revoke all on function private.app_lock_configure(text,text[]) from public,anon,authenticated;
grant execute on function private.app_lock_configure(text,text[]) to authenticated;

create function private.app_lock_verify(requested_code text)
returns boolean language sql volatile security definer set search_path='' as $$
  select private.app_lock_check_code(requested_code);
$$;
revoke all on function private.app_lock_verify(text) from public,anon,authenticated;
grant execute on function private.app_lock_verify(text) to authenticated;

create function private.app_lock_unlock(requested_code text,requested_area text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare current_session uuid;
begin
  if auth.uid() is null then return false; end if;
  current_session:=nullif(auth.jwt()->>'session_id','')::uuid;
  if current_session is null or not exists(select 1 from private.app_lock_areas
    where user_id=auth.uid() and area=requested_area) then return false; end if;
  if not private.app_lock_check_code(requested_code) then return false; end if;
  insert into private.app_lock_unlocks(user_id,session_id,area,expires_at)
    values(auth.uid(),current_session,requested_area,now()+interval '5 minutes')
    on conflict(user_id,session_id,area) do update set expires_at=excluded.expires_at;
  return true;
end $$;
revoke all on function private.app_lock_unlock(text,text) from public,anon,authenticated;
grant execute on function private.app_lock_unlock(text,text) to authenticated;

create function private.app_lock_lock(requested_area text)
returns void language sql volatile security definer set search_path='' as $$
  delete from private.app_lock_unlocks where user_id=(select auth.uid())
    and session_id=nullif((select auth.jwt()->>'session_id'),'')::uuid and area=requested_area;
$$;
revoke all on function private.app_lock_lock(text) from public,anon,authenticated;
grant execute on function private.app_lock_lock(text) to authenticated;

create function private.app_lock_status()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'configured',exists(select 1 from private.app_lock_codes c where c.user_id=(select auth.uid())),
    'areas',coalesce((select jsonb_agg(a.area order by a.area) from private.app_lock_areas a
      where a.user_id=(select auth.uid())),'[]'::jsonb)
  ) where (select auth.uid()) is not null;
$$;
revoke all on function private.app_lock_status() from public,anon,authenticated;
grant execute on function private.app_lock_status() to authenticated;

create function public.app_lock_status() returns jsonb language sql stable security invoker set search_path=''
as $$ select private.app_lock_status(); $$;
create function public.app_lock_open(area text) returns boolean language sql stable security invoker set search_path=''
as $$ select private.app_lock_open(area); $$;
create function public.app_lock_configure(code text,areas text[]) returns boolean language sql volatile security invoker set search_path=''
as $$ select private.app_lock_configure(code,areas); $$;
create function public.app_lock_verify(code text) returns boolean language sql volatile security invoker set search_path=''
as $$ select private.app_lock_verify(code); $$;
create function public.app_lock_unlock(code text,area text) returns boolean language sql volatile security invoker set search_path=''
as $$ select private.app_lock_unlock(code,area); $$;
create function public.app_lock_lock(area text) returns void language sql volatile security invoker set search_path=''
as $$ select private.app_lock_lock(area); $$;
revoke all on function public.app_lock_status(),public.app_lock_open(text),
  public.app_lock_configure(text,text[]),public.app_lock_verify(text),public.app_lock_unlock(text,text),public.app_lock_lock(text)
  from public,anon;
grant execute on function public.app_lock_status(),public.app_lock_open(text),
  public.app_lock_configure(text,text[]),public.app_lock_verify(text),public.app_lock_unlock(text,text),public.app_lock_lock(text)
  to authenticated;

-- Restrictive policies combine with the existing tenant/owner policies.
create policy app_lock_memories on public.memories as restrictive for select to authenticated using(private.app_lock_open('memories'));
create policy app_lock_memory_tags on public.memory_tags as restrictive for select to authenticated using(private.app_lock_open('memories'));
create policy app_lock_memory_tag_links on public.memory_tag_links as restrictive for select to authenticated using(private.app_lock_open('memories'));
create policy app_lock_memory_media on public.memory_media as restrictive for select to authenticated
  using(private.app_lock_open('gallery') and private.app_lock_open('memories'));
create policy app_lock_moments on public.milestones as restrictive for select to authenticated using(private.app_lock_open('moments'));
create policy app_lock_moment_media on public.milestone_media as restrictive for select to authenticated
  using(private.app_lock_open('gallery') and private.app_lock_open('moments'));
create policy app_lock_entry_comments on public.entry_comments as restrictive for select to authenticated using(
  (memory_id is null or private.app_lock_open('memories')) and
  (milestone_id is null or private.app_lock_open('moments')));
create policy app_lock_media_comments on public.media_comments as restrictive for select to authenticated using(
  private.app_lock_open('gallery') and
  (memory_media_id is null or private.app_lock_open('memories')) and
  (milestone_media_id is null or private.app_lock_open('moments')));
create policy app_lock_plans on public.plans as restrictive for select to authenticated using(private.app_lock_open('plans'));
create policy app_lock_plan_checklist on public.plan_checklist_items as restrictive for select to authenticated using(private.app_lock_open('plans'));
create policy app_lock_plan_reminders on public.plan_reminders as restrictive for select to authenticated using(private.app_lock_open('plans'));
create policy app_lock_plan_attachments on public.plan_attachments as restrictive for select to authenticated using(private.app_lock_open('plans'));
create policy app_lock_bucket_lists on public.bucket_lists as restrictive for select to authenticated using(private.app_lock_open('bucket'));
create policy app_lock_bucket_items on public.bucket_list_items as restrictive for select to authenticated using(private.app_lock_open('bucket'));
create policy app_lock_bucket_subtasks on public.bucket_item_subtasks as restrictive for select to authenticated using(private.app_lock_open('bucket'));
create policy app_lock_notes on public.notes as restrictive for select to authenticated using(private.app_lock_open('notes'));
create policy app_lock_note_reads on public.note_reads as restrictive for select to authenticated using(private.app_lock_open('notes'));
create policy app_lock_drawings on public.drawing_notes as restrictive for select to authenticated using(private.app_lock_open('drawings'));
create policy app_lock_wishlist_items on public.wishlist_items as restrictive for select to authenticated using(private.app_lock_open('wishlist'));
create policy app_lock_wishlist_secrets on public.wishlist_purchase_secrets as restrictive for select to authenticated using(private.app_lock_open('wishlist'));
create policy app_lock_notifications on public.notifications as restrictive for select to authenticated using(private.app_lock_open('notifications'));
create policy app_lock_storage on storage.objects as restrictive for select to authenticated using(
  (bucket_id not in ('memory-media','moment-media') or private.app_lock_open('gallery')) and
  (bucket_id<>'memory-media' or private.app_lock_open('memories')) and
  (bucket_id<>'moment-media' or private.app_lock_open('moments')) and
  (bucket_id<>'plan-attachments' or private.app_lock_open('plans')) and
  (bucket_id<>'drawing-notes' or private.app_lock_open('drawings')));
