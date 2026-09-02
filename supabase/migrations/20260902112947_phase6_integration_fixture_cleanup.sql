-- Removes only the isolated fixtures created by phase6_integration_fixture_setup.
-- Abort before deleting anything if their provenance or ownership has changed.
do $cleanup$
declare fixture_users uuid[]; fixture_couples uuid[]; relation record; unexpected bigint;
begin
 lock table private.phase6_test_fixture in exclusive mode;
 select array_agg(user_id),array_agg(distinct couple_id) into fixture_users,fixture_couples from private.phase6_test_fixture;
 if cardinality(fixture_users) is distinct from 3 or cardinality(fixture_couples) is distinct from 2
    or (select array_agg(position order by position) from private.phase6_test_fixture) is distinct from array[0,1,2] then
  raise exception 'Unexpected fixture set; no cleanup performed';
 end if;
 if (select count(*) from private.phase6_test_fixture f join auth.users u on u.id=f.user_id join public.profiles p on p.user_id=f.user_id
     where f.email='phase6-'||f.user_id::text||'@example.test' and u.email=f.email and p.display_name='Media fixture')<>3 then
  raise exception 'Fixture account provenance changed; no cleanup performed';
 end if;
 if exists(select 1 from public.couple_memberships where couple_id=any(fixture_couples) and not(user_id=any(fixture_users)))
    or exists(select 1 from public.couple_memberships where user_id=any(fixture_users) and not(couple_id=any(fixture_couples)))
    or exists(select 1 from public.couples where id=any(fixture_couples) and not(created_by=any(fixture_users))) then
  raise exception 'Unexpected fixture membership; no cleanup performed';
 end if;
 if (select count(*) from public.memories where couple_id=any(fixture_couples))<>2
    or exists(select 1 from public.memories m where m.couple_id=any(fixture_couples) and
      (m.title<>'Fictional media verification' or m.id not in(select memory_id from private.phase6_test_fixture) or m.description is not null)) then
  raise exception 'Unexpected fixture story content; no cleanup performed';
 end if;
 if exists(select 1 from public.memory_media mm join public.memories m on m.id=mm.memory_id where m.couple_id=any(fixture_couples))
    or exists(select 1 from storage.objects where bucket_id='memory-media' and split_part(name,'/',1)=any(fixture_couples::text[])) then
  raise exception 'Remove fixture binaries and media metadata before account cleanup';
 end if;
 -- Refuse cascade cleanup if any unrelated feature data was added to a fixture couple.
 for relation in
  select c.conrelid::regclass as target,a.attname as column_name
  from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
  where c.contype='f' and c.confrelid='public.couples'::regclass and cardinality(c.conkey)=1
    and c.conrelid not in('public.memories'::regclass,'public.couple_memberships'::regclass)
 loop
  execute format('select count(*) from %s where %I=any($1)',relation.target,relation.column_name) into unexpected using fixture_couples;
  if unexpected<>0 then raise exception 'Unexpected fixture feature data; no cleanup performed';end if;
 end loop;
 delete from public.couples where id=any(fixture_couples);
 delete from auth.users where id=any(fixture_users);
 if exists(select 1 from auth.users where id=any(fixture_users)) or exists(select 1 from public.couples where id=any(fixture_couples)) then
  raise exception 'Fixture cleanup incomplete';
 end if;
end $cleanup$;
drop table private.phase6_test_fixture;
