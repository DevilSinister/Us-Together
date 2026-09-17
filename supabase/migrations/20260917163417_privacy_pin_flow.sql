-- Existing codes may have 6-12 digits. New PINs must have exactly 4 or 6.
alter table private.app_lock_codes add column pin_length smallint check (pin_length in (4,6));

create or replace function private.app_lock_configure(requested_code text, requested_areas text[])
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare normalized text[];
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501'; end if;
  if requested_code is null then return false; end if;
  if requested_areas is null or exists(select 1 from unnest(requested_areas) a where a is null or a not in
    ('gallery','memories','moments','plans','bucket','notes','drawings','wishlist','notifications')) then
    raise exception 'Unknown area.' using errcode='22023'; end if;
  select coalesce(array_agg(distinct a),'{}'::text[]) into normalized from unnest(requested_areas) a;
  if not exists(select 1 from private.app_lock_codes where user_id=auth.uid()) then
    if requested_code !~ '^([0-9]{4}|[0-9]{6})$' then
      raise exception 'Use a 4- or 6-digit PIN.' using errcode='22023'; end if;
    insert into private.app_lock_codes(user_id,code_hash,pin_length)
      values(auth.uid(),extensions.crypt(requested_code,extensions.gen_salt('bf',12)),length(requested_code));
  end if;
  if not private.app_lock_check_code(requested_code) then return false; end if;
  delete from private.app_lock_areas where user_id=auth.uid();
  insert into private.app_lock_areas(user_id,area) select auth.uid(),unnest(normalized);
  delete from private.app_lock_unlocks where user_id=auth.uid();
  return true;
end $$;

create function private.app_lock_change_code(current_code text,new_code text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
begin
  if auth.uid() is null then return false; end if;
  if new_code is null or new_code !~ '^([0-9]{4}|[0-9]{6})$' then
    raise exception 'Use a 4- or 6-digit PIN.' using errcode='22023'; end if;
  if not private.app_lock_check_code(current_code) then return false; end if;
  update private.app_lock_codes set
    code_hash=extensions.crypt(new_code,extensions.gen_salt('bf',12)),
    pin_length=length(new_code), failed_attempts=0, blocked_until=null, updated_at=now()
    where user_id=auth.uid();
  delete from private.app_lock_unlocks where user_id=auth.uid();
  return true;
end $$;
revoke all on function private.app_lock_change_code(text,text) from public,anon,authenticated;
grant execute on function private.app_lock_change_code(text,text) to authenticated;

create or replace function private.app_lock_status()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'configured',exists(select 1 from private.app_lock_codes c where c.user_id=(select auth.uid())),
    'pin_length',(select c.pin_length from private.app_lock_codes c where c.user_id=(select auth.uid())),
    'areas',coalesce((select jsonb_agg(a.area order by a.area) from private.app_lock_areas a
      where a.user_id=(select auth.uid())),'[]'::jsonb)
  ) where (select auth.uid()) is not null;
$$;

create function public.app_lock_change_code(current_code text,new_code text)
returns boolean language sql volatile security invoker set search_path=''
as $$ select private.app_lock_change_code(current_code,new_code); $$;
revoke all on function public.app_lock_change_code(text,text) from public,anon;
grant execute on function public.app_lock_change_code(text,text) to authenticated;
