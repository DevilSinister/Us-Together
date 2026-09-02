-- Serialize tag catalog allocation without granting UPDATE on couple identity rows.
create or replace function private.guard_memory_tags() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='memory_tags' then
  if tg_op='UPDATE' and new.couple_id is distinct from old.couple_id then raise insufficient_privilege using message='Tag ownership is immutable.'; end if;
  new.name:=lower(btrim(new.name));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.couple_id::text,6006));
  if tg_op='INSERT' and (select count(*) from public.memory_tags where couple_id=new.couple_id)>=500 and not exists(select 1 from public.memory_tags where couple_id=new.couple_id and name=new.name) then raise check_violation using message='Tag catalog limit reached.'; end if;
 else
  perform 1 from public.memories where id=new.memory_id for update;
  if tg_op='UPDATE' and new.memory_id is distinct from old.memory_id then raise insufficient_privilege using message='Tag link cannot move.'; end if;
  if tg_op='INSERT' and (select count(*) from public.memory_tag_links where memory_id=new.memory_id)>=8 then raise check_violation using message='Choose up to eight tags.'; end if;
 end if;
 return new;
end $$;
