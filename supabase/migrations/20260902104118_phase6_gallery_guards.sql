create function public.list_memories_by_tag(tag_name text, favorites boolean default false, before_date date default null, before_id uuid default null)
returns table(id uuid) language sql stable security invoker set search_path='' as $$
 select m.id from public.memories m
 where (not favorites or m.is_favorite)
 and (before_date is null or (m.memory_date,m.id)<(before_date,before_id))
 and exists(select 1 from public.memory_tag_links l join public.memory_tags t on t.id=l.tag_id where l.memory_id=m.id and t.name=lower(btrim(tag_name)))
 order by m.memory_date desc,m.id desc limit 13;
$$;
revoke all on function public.list_memories_by_tag(text,boolean,date,uuid) from public,anon;
grant execute on function public.list_memories_by_tag(text,boolean,date,uuid) to authenticated;
create function private.guard_memory_tags() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='memory_tags' then
  if tg_op='UPDATE' and new.couple_id is distinct from old.couple_id then raise insufficient_privilege using message='Tag ownership is immutable.'; end if;
  new.name:=lower(btrim(new.name));
  perform 1 from public.couples where id=new.couple_id for update;
  if tg_op='INSERT' and (select count(*) from public.memory_tags where couple_id=new.couple_id)>=500 and not exists(select 1 from public.memory_tags where couple_id=new.couple_id and name=new.name) then raise check_violation using message='Tag catalog limit reached.'; end if;
 else
  perform 1 from public.memories where id=new.memory_id for update;
  if tg_op='UPDATE' and new.memory_id is distinct from old.memory_id then raise insufficient_privilege using message='Tag link cannot move.'; end if;
  if tg_op='INSERT' and (select count(*) from public.memory_tag_links where memory_id=new.memory_id)>=8 then raise check_violation using message='Choose up to eight tags.'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_memory_tags() from public,anon,authenticated;
create trigger memory_tags_guard before insert or update on public.memory_tags for each row execute function private.guard_memory_tags();
create trigger memory_links_guard before insert or update on public.memory_tag_links for each row execute function private.guard_memory_tags();
create function private.guard_memory_provenance() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.source_plan_id is not null and not exists(select 1 from public.plans where id=new.source_plan_id and status='completed') then raise check_violation using message='Complete the source plan first.'; end if;
 elsif (new.source_plan_id is distinct from old.source_plan_id and (new.source_plan_id is not null or exists(select 1 from public.plans where id=old.source_plan_id)))
 or (new.source_bucket_item_id is distinct from old.source_bucket_item_id and (new.source_bucket_item_id is not null or exists(select 1 from public.bucket_list_items where id=old.source_bucket_item_id))) then
  raise insufficient_privilege using message='Memory provenance is immutable.';
 end if;
 return new;
end $$;
revoke all on function private.guard_memory_provenance() from public,anon,authenticated;
create trigger memories_provenance before insert or update on public.memories for each row execute function private.guard_memory_provenance();
