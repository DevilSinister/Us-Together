-- Phase 6 authorization and bounded-gallery regression. All effects roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table entry_tap_results(result text);
grant select,insert on entry_tap_results to authenticated,anon;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('70000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','entry-a@example.test','',now(),'{}','{}',now(),now()),
('70000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','entry-b@example.test','',now(),'{}','{}',now(),now()),
('70000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','entry-c@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001'),('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003');
insert into public.couple_memberships(couple_id,user_id) values('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001'),('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002'),('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003');
insert into public.memories(id,couple_id,created_by,title,memory_date) values('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Fictional memory','2026-08-20'),('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003','Foreign memory','2026-08-20');

insert into public.milestones(id,couple_id,created_by,title,milestone_date,type) values('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Fictional moment','2026-09-02','custom');
insert into public.milestone_media(id,milestone_id,created_by,storage_path,media_type,mime_type,size_bytes) values('74000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original','image','image/png',100);
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
insert into entry_tap_results select lives_ok($$insert into public.entry_comments(id,memory_id,body) values('75000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','Fictional comment')$$,'owner comments on memory');
insert into entry_tap_results select lives_ok($$insert into public.entry_comments(milestone_id,body) values('73000000-0000-4000-8000-000000000001','Moment comment')$$,'owner comments on moment');
insert into entry_tap_results select throws_ok($$insert into public.entry_comments(memory_id,created_by,body) values('72000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Forged')$$,'42501',null,'comment creator cannot be forged');
insert into entry_tap_results select throws_ok($$insert into public.entry_comments(memory_id,body) values('72000000-0000-4000-8000-000000000002','Foreign')$$,'42501',null,'foreign parent comment denied');
insert into entry_tap_results select throws_ok($$insert into public.entry_comments(memory_id,milestone_id,body) values('72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','Two parents')$$,'42501',null,'two-parent comment denied');
insert into entry_tap_results select throws_ok($$update public.entry_comments set body='Tamper'$$,'42501',null,'comment update is not granted');
insert into entry_tap_results select ok(private.can_upload_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'moment creator can upload allocated path');
insert into entry_tap_results select ok(not private.can_upload_milestone_object('guessed/path'),'unallocated moment upload denied');
insert into entry_tap_results select throws_ok($$update public.milestone_media set state='ready'$$,'42501',null,'client cannot publish moment media');
insert into entry_tap_results select throws_ok($$delete from public.milestone_media$$,'42501',null,'client cannot bypass moment binary cleanup');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select is((select count(*)::int from public.entry_comments),2,'partner reads shared comments');
with removed as(delete from public.entry_comments where id='75000000-0000-4000-8000-000000000001' returning id) insert into entry_tap_results select is(count(*)::int,0,'partner cannot remove author comment') from removed;
insert into entry_tap_results select ok(not private.can_access_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'unverified moment binary hidden from partner');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000003',true);
insert into entry_tap_results select is((select count(*)::int from public.entry_comments),0,'foreign comments hidden');
insert into entry_tap_results select is((select count(*)::int from public.milestone_media),0,'foreign moment media hidden');
reset role;
update public.milestone_media set state='ready' where id='74000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select ok(private.can_access_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'partner reads verified moment');
reset role;
update public.couple_memberships set left_at=now() where user_id='70000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select is((select count(*)::int from public.entry_comments),0,'former partner comments hidden');
insert into entry_tap_results select ok(not private.can_access_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'former partner binary denied');
reset role;
set local role anon;
insert into entry_tap_results select throws_ok($$select * from public.entry_comments$$,'42501',null,'anonymous comments denied');
insert into entry_tap_results select throws_ok($$select * from public.milestone_media$$,'42501',null,'anonymous moment media denied');
reset role;
select result from entry_tap_results;
select * from finish();
rollback;
