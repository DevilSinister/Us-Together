-- Isolated local RLS test; every fixture rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table lock_results(result text);
grant select,insert on lock_results to authenticated,anon;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','lock-a@example.test','',now(),'{}','{}',now(),now()),
('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','lock-b@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
insert into public.couple_memberships(couple_id,user_id) values
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001'),
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002');
insert into public.memories(id,couple_id,created_by,title,memory_date) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Fictional memory','2026-09-01');
insert into public.memory_media(id,memory_id,created_by,storage_path,media_type,mime_type,size_bytes) values
('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001/a2000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000001/original','image','image/png',100);
update public.memory_media set state='ready' where id='a3000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","session_id":"a4000000-0000-4000-8000-000000000001"}',true);
insert into lock_results select is((select count(*)::int from public.shared_gallery),1,'gallery visible before a lock');
insert into lock_results select is(public.app_lock_configure('123456',array['gallery']),true,'owner configures gallery lock');
insert into lock_results select is((select count(*)::int from public.shared_gallery),0,'gallery view hidden while locked');
insert into lock_results select is((select count(*)::int from public.memory_media),0,'direct media metadata hidden while locked');
insert into lock_results select is((select count(*)::int from public.memories),1,'unselected memory stories remain visible');
insert into lock_results select is(public.app_lock_unlock('000000','gallery'),false,'wrong code denied');
insert into lock_results select is(public.app_lock_unlock('123456','gallery'),true,'correct code unlocks current session');
insert into lock_results select is((public.app_lock_status()->>'pin_length')::int,6,'new PIN length reported');
insert into lock_results select is(public.app_lock_change_code('000000','4321'),false,'wrong current PIN cannot change it');
insert into lock_results select is(public.app_lock_change_code('123456','4321'),true,'current PIN changes to four digits');
insert into lock_results select is((public.app_lock_status()->>'pin_length')::int,4,'changed PIN length reported');
insert into lock_results select is((select count(*)::int from public.shared_gallery),0,'PIN change revokes existing unlocks');
insert into lock_results select is(public.app_lock_unlock('123456','gallery'),false,'old PIN cannot unlock');
insert into lock_results select is(public.app_lock_unlock('4321','gallery'),true,'new four-digit PIN unlocks');
insert into lock_results select is((select count(*)::int from public.shared_gallery),1,'unlocked gallery visible');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","session_id":"a4000000-0000-4000-8000-000000000002"}',true);
insert into lock_results select is((select count(*)::int from public.shared_gallery),0,'other session stays locked');
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000002","session_id":"a4000000-0000-4000-8000-000000000003"}',true);
insert into lock_results select is((select count(*)::int from public.shared_gallery),1,'partner uses independent lock choices');
set local role anon;
insert into lock_results select throws_ok($$select public.app_lock_status()$$,'42501',null,'anonymous status denied');
insert into lock_results select throws_ok($$select public.app_lock_unlock('123456','gallery')$$,'42501',null,'anonymous unlock denied');
reset role;
select result from lock_results;
select * from finish();
rollback;
