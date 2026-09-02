-- Rollback-only final gate; postconditions abort if any fictional fixture survives.
-- https://www.postgresql.org/docs/current/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING
do $verify$
declare failures text; assertion_count integer:=0;
begin
begin
-- Phase 6 authorization and bounded-gallery regression. All effects roll back.
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
perform no_plan();
create temporary table memory_tap_results(result text);
grant select,insert on memory_tap_results to authenticated,anon;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('60000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','memory-a@example.test','',now(),'{}','{}',now(),now()),
('60000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','memory-b@example.test','',now(),'{}','{}',now(),now()),
('60000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','memory-c@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001'),('61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003');
insert into public.couple_memberships(couple_id,user_id) values('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001'),('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002'),('61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003');
insert into public.memories(id,couple_id,created_by,title,memory_date) values('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Fictional memory','2026-08-20'),('62000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','Foreign memory','2026-08-20');
set local role authenticated;
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
insert into memory_tap_results select is(public.consume_memory_media_budget('upload'),true,'first upload budget allowed');
do $budget$ begin for i in 1..59 loop perform public.consume_memory_media_budget('upload');end loop;end $budget$;
insert into memory_tap_results select is(public.consume_memory_media_budget('upload'),false,'hourly upload budget is bounded');
insert into memory_tap_results select is(public.consume_memory_media_budget('process'),true,'processing budget is separate');
insert into memory_tap_results select throws_ok($$select public.consume_memory_media_budget('other')$$,'22023',null,'unknown budget kind rejected');
insert into memory_tap_results select is((select count(*)::int from public.memories where id::text like '62000000%'),1,'partner sees only own couple memory');
insert into memory_tap_results select is(public.update_memory_details('{"id":"62000000-0000-4000-8000-000000000002","version":1}')->>'code','NOT_FOUND','foreign edit denied');
insert into memory_tap_results select is(public.update_memory_details('{"id":"62000000-0000-4000-8000-000000000001","version":1,"title":"Kept together","description":"A fictional story","memoryDate":"2026-08-21","rating":5,"favorite":true,"tags":["Travel","travel"]}')->>'ok','true','partner updates story and normalized tags atomically');
insert into memory_tap_results select is((select version from public.memories where id='62000000-0000-4000-8000-000000000001'),2,'memory revision advances');
insert into memory_tap_results select is((select count(*)::int from public.memory_tag_links where memory_id='62000000-0000-4000-8000-000000000001'),1,'duplicate tags collapse');
insert into memory_tap_results select is((select count(*)::int from public.list_memories_by_tag('travel',true)),1,'tag and favorite filters return the memory');
insert into memory_tap_results select is(public.update_memory_details('{"id":"62000000-0000-4000-8000-000000000001","version":1}')->>'code','CONFLICT','stale revision rejected');
insert into memory_tap_results select is(public.update_memory_details('{"id":"62000000-0000-4000-8000-000000000001"}')->>'code','CONFLICT','missing revision rejected');
insert into memory_tap_results select throws_ok($$update public.memories set created_by='60000000-0000-4000-8000-000000000002' where id='62000000-0000-4000-8000-000000000001'$$,'42501',null,'creator immutable');
insert into memory_tap_results select throws_ok($$update public.memories set couple_id='61000000-0000-4000-8000-000000000002' where id='62000000-0000-4000-8000-000000000001'$$,'42501',null,'couple immutable');
insert into memory_tap_results select throws_ok($$select public.update_memory_details('{"id":"62000000-0000-4000-8000-000000000001","version":2,"title":"Bad","memoryDate":"2026-02-30","favorite":false,"tags":[]}')$$,'22008',null,'impossible calendar date denied');
insert into memory_tap_results select is((select title from public.memories where id='62000000-0000-4000-8000-000000000001'),'Kept together','failed edit preserves story');
insert into memory_tap_results select throws_ok($$select public.update_memory_details('{"id":"62000000-0000-4000-8000-000000000001","version":2,"tags":["a","b","c","d","e","f","g","h","i"]}')$$,'23514',null,'more than eight tags rejected');
insert into memory_tap_results select throws_ok($$insert into public.memory_media(memory_id,storage_path,media_type,mime_type,size_bytes) values('62000000-0000-4000-8000-000000000001','fake','image','image/png',100)$$,'42501',null,'browser cannot allocate media');
reset role;
insert into public.memory_media(id,memory_id,created_by,storage_path,media_type,mime_type,size_bytes) values('63000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original','image','image/png',100);
insert into memory_tap_results select throws_ok($$update public.memory_media set storage_path='wrong/path' where id='63000000-0000-4000-8000-000000000001'$$,'23514',null,'media path bound to exact metadata');
set local role authenticated;
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
insert into memory_tap_results select ok(private.can_upload_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'creator can upload exact pending path');
insert into memory_tap_results select ok(not private.can_upload_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/guessed/original'),'unallocated path denied');
insert into memory_tap_results select throws_ok($$update public.memory_media set state='ready' where id='63000000-0000-4000-8000-000000000001'$$,'42501',null,'browser cannot forge ready');
insert into memory_tap_results select throws_ok($$delete from public.memory_media where id='63000000-0000-4000-8000-000000000001'$$,'42501',null,'browser cannot bypass binary cleanup');
insert into memory_tap_results select throws_ok($$delete from public.memories where id='62000000-0000-4000-8000-000000000001'$$,'23503',null,'parent deletion blocked while media exists');
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
insert into memory_tap_results select ok(not private.can_upload_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'partner cannot upload into another users slot');
insert into memory_tap_results select ok(not private.can_access_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'partner cannot read unverified binary');
reset role;
update public.memory_media set state='ready' where id='63000000-0000-4000-8000-000000000001';
set local role authenticated;
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
insert into memory_tap_results select ok(private.can_access_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'partner reads verified binary');
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
insert into memory_tap_results select ok(not private.can_access_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'foreign binary denied');
insert into memory_tap_results select is((select count(*)::int from public.memory_media where id='63000000-0000-4000-8000-000000000001'),0,'foreign media metadata hidden');
reset role;
update public.memory_media set state='pending',upload_expires_at=now()-interval '1 second' where id='63000000-0000-4000-8000-000000000001';
set local role authenticated;
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
insert into memory_tap_results select ok(not private.can_upload_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'expired upload authorization denied');
reset role;
-- Quotas are enforced for privileged allocation as well as the browser path.
insert into public.memory_media(id,memory_id,created_by,storage_path,media_type,mime_type,size_bytes)
select x,'62000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/'||x::text||'/original','image','image/png',100 from (select gen_random_uuid() x from generate_series(1,29)) ids;
insert into memory_tap_results select throws_ok($$insert into public.memory_media(id,memory_id,created_by,storage_path,media_type,mime_type,size_bytes) values('63000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000002/original','image','image/png',100)$$,'23514',null,'thirty-file memory quota enforced');
-- Bounded pagination over a realistic metadata collection.
insert into public.memories(couple_id,created_by,title,memory_date,is_favorite)
select '61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Fictional gallery row '||n,'2026-08-20'::date-n,true from generate_series(1,1000)n;
insert into public.memory_tag_links(memory_id,tag_id)
select m.id,t.id from public.memories m join public.memory_tags t on t.couple_id=m.couple_id and t.name='travel' where m.couple_id='61000000-0000-4000-8000-000000000001' and m.title like 'Fictional gallery row%';
set local role authenticated;
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
insert into memory_tap_results select is((select count(*)::int from public.list_memories_by_tag('travel',true)),13,'tag query bounded to thirteen candidates with 1001 memories');
insert into memory_tap_results select is((select count(*)::int from public.list_memories_by_tag('travel',true,'2026-08-20','62000000-0000-4000-8000-000000000001')),13,'cursor reaches older tagged memories');
reset role;
update public.couple_memberships set left_at=now() where user_id='60000000-0000-4000-8000-000000000002';
set local role authenticated;
perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
insert into memory_tap_results select is((select count(*)::int from public.memories where couple_id='61000000-0000-4000-8000-000000000001'),0,'former partner cannot read retained memories');
insert into memory_tap_results select ok(not private.can_access_memory_object('61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000001/original'),'former partner cannot read binary');
reset role;
set local role anon;
insert into memory_tap_results select throws_ok($$select * from public.memory_media$$,'42501',null,'anonymous metadata denied');
insert into memory_tap_results select throws_ok($$select * from public.list_memories_by_tag('travel')$$,'42501',null,'anonymous gallery RPC denied');
reset role;

select string_agg(result,E'\n') into failures from memory_tap_results where result like 'not ok%';
select count(*) into assertion_count from memory_tap_results;
if failures is not null then raise exception '%',failures;end if;
raise exception using errcode='P6006',message='Phase 6 assertions passed; roll back fixtures.';
exception when sqlstate 'P6006' then null;
end;
-- PostgreSQL rolls back all persistent changes inside the caught inner block.
-- Verify that property explicitly before the surrounding migration may commit.
if assertion_count <> 37 then raise exception 'Security assertions did not all execute';end if;
if exists(select 1 from auth.users where id in ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003'))
or exists(select 1 from public.couples where id in ('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002'))
or exists(select 1 from public.memories where couple_id in ('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002'))
or to_regclass('pg_temp.memory_tap_results') is not null then
 raise exception 'Fixture rollback verification failed; abort entire migration';
end if;
end $verify$;