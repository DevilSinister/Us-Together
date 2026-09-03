-- This trigger serializes list creation by locking the owning couple. It must
-- run as its private owner because callers deliberately have only RLS-scoped
-- access to public.couples. The function is not executable through PostgREST.
create or replace function private.limit_bucket_lists()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.couples
  where id = new.couple_id
  for update;

  if (select count(*) from public.bucket_lists where couple_id = new.couple_id) >= 100 then
    raise exception using
      errcode = '23514',
      message = 'A space can have at most 100 lists.';
  end if;

  return new;
end;
$$;

revoke all on function private.limit_bucket_lists() from public, anon, authenticated;
