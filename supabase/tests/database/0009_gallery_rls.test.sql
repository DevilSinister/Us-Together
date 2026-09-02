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

insert into public.memory_media(id,memory_id,created_by,storage_path,media_type,mime_type,size_bytes) values
('74000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001/72000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000002/original','image','image/png',100);
update public.memory_media set state='ready' where id='74000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
insert into entry_tap_results select is((select count(*)::int from public.shared_gallery),1,'only ready files appear in gallery');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(milestone_media_id,body) values('74000000-0000-4000-8000-000000000001','Pending photo')$$,'42501',null,'unverified file comments denied');
reset role;
update public.milestone_media set state='ready' where id='74000000-0000-4000-8000-000000000001';
set local role authenticated;
insert into entry_tap_results select lives_ok($$insert into public.media_comments(id,memory_media_id,body) values('76000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002','Memory photo comment')$$,'memory photo accepts comment');
insert into entry_tap_results select lives_ok($$insert into public.media_comments(milestone_media_id,body) values('74000000-0000-4000-8000-000000000001','Moment photo comment')$$,'moment photo accepts comment');
insert into entry_tap_results select is((select count(*)::int from public.media_comments where memory_media_id='74000000-0000-4000-8000-000000000002'),1,'photo comments isolated from other file');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,created_by,body) values('74000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002','Forged author')$$,'42501',null,'author cannot be forged');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,milestone_media_id,body) values('74000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000001','Two files')$$,'42501',null,'comment cannot target two files');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002',' ')$$,'23514',null,'empty comment rejected');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002',repeat('x',2001))$$,'23514',null,'oversize comment rejected');
insert into entry_tap_results select throws_ok($$update public.media_comments set body='tamper'$$,'42501',null,'comment update unavailable');
insert into entry_tap_results select throws_ok($$select public.set_entry_reminder('72000000-0000-4000-8000-000000000001',null,now()+interval '1 day')$$,'42501',null,'retired memory reminder API denied');
insert into entry_tap_results select throws_ok($$select * from public.entry_reminders$$,'42501',null,'retired reminder table unavailable');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select is((select count(*)::int from public.shared_gallery),2,'partner sees both gallery kinds');
insert into entry_tap_results select is((select count(*)::int from public.media_comments),2,'partner reads photo comments');
insert into entry_tap_results select lives_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002','Partner reply')$$,'partner can reply on photo');
with removed as(delete from public.media_comments where id='76000000-0000-4000-8000-000000000001' returning id) insert into entry_tap_results select is(count(*)::int,0,'partner cannot delete author comment') from removed;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000003',true);
insert into entry_tap_results select is((select count(*)::int from public.shared_gallery),0,'foreign gallery excludes private files');
insert into entry_tap_results select is((select count(*)::int from public.media_comments),0,'foreign comments hidden');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002','Foreign')$$,'42501',null,'foreign comment denied');
with removed as(delete from public.media_comments where id='76000000-0000-4000-8000-000000000001' returning id) insert into entry_tap_results select is(count(*)::int,0,'foreign delete denied') from removed;
reset role;
update public.couple_memberships set left_at=now() where user_id='70000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select is((select count(*)::int from public.shared_gallery),0,'former partner gallery hidden');
insert into entry_tap_results select is((select count(*)::int from public.media_comments),0,'former partner comments hidden');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002','Former')$$,'42501',null,'former partner cannot comment');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
with removed as(delete from public.media_comments where id='76000000-0000-4000-8000-000000000001' returning id) insert into entry_tap_results select is(count(*)::int,1,'author deletes own comment') from removed;
insert into public.media_comments(memory_media_id,body) select '74000000-0000-4000-8000-000000000002','Capacity fixture' from generate_series(1,499);
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002','Over capacity')$$,'23514','Comment limit reached','500-comment limit enforced');
reset role;
delete from public.memory_media where id='74000000-0000-4000-8000-000000000002';
insert into entry_tap_results select is((select count(*)::int from public.media_comments where memory_media_id='74000000-0000-4000-8000-000000000002'),0,'file deletion removes attached comments');
insert into entry_tap_results select is(private.deliver_entry_reminders(100),0,'retired delivery worker sends nothing');
insert into entry_tap_results select is((select count(*)::int from cron.job where jobname='us-together-entry-reminders'),0,'entry cron removed');
insert into entry_tap_results select is((select count(*)::int from cron.job where jobname='us-together-plan-reminders' and active),1,'plan reminder cron remains active');
insert into entry_tap_results select ok(has_table_privilege('authenticated','public.plan_reminders','INSERT'),'plan reminder creation remains granted');
set local role anon;
insert into entry_tap_results select throws_ok($$select * from public.shared_gallery$$,'42501',null,'anonymous gallery denied');
insert into entry_tap_results select throws_ok($$select * from public.media_comments$$,'42501',null,'anonymous comments denied');
insert into entry_tap_results select throws_ok($$insert into public.media_comments(memory_media_id,body) values('74000000-0000-4000-8000-000000000002','Anonymous')$$,'42501',null,'anonymous comment denied');
reset role;
select result from entry_tap_results;
select * from finish();
rollback;
