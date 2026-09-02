-- All fictional data rolls back before this verification migration can commit.
do $verify$
declare failures text; assertion_count integer:=0;
begin
begin
-- Phase 6 authorization and bounded-gallery regression. All effects roll back.
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
perform no_plan();
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
perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
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
insert into entry_tap_results select lives_ok($$select public.set_entry_reminder('72000000-0000-4000-8000-000000000001',null,now()+interval '1 day')$$,'memory reminder scheduled');
insert into entry_tap_results select lives_ok($$select public.set_entry_reminder('72000000-0000-4000-8000-000000000001',null,now()+interval '2 days')$$,'reminder replaces previous schedule');
insert into entry_tap_results select is((select count(*)::int from public.entry_reminders),1,'replacement does not duplicate reminder');
insert into entry_tap_results select throws_ok($$select public.set_entry_reminder('72000000-0000-4000-8000-000000000001',null,now()-interval '1 day')$$,'42501',null,'past reminder denied');
insert into entry_tap_results select throws_ok($$insert into public.entry_reminders(memory_id,user_id,due_at) values('72000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002',now()+interval '1 day')$$,'42501',null,'reminder recipient cannot be forged');
insert into entry_tap_results select throws_ok($$update public.entry_reminders set state='delivered'$$,'42501',null,'client cannot forge delivery');
insert into entry_tap_results select throws_ok($$select private.deliver_entry_reminders(100)$$,'42501',null,'worker unavailable to browser');
perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select is((select count(*)::int from public.entry_comments),2,'partner reads shared comments');
with removed as(delete from public.entry_comments where id='75000000-0000-4000-8000-000000000001' returning id) insert into entry_tap_results select is(count(*)::int,0,'partner cannot remove author comment') from removed;
insert into entry_tap_results select is((select count(*)::int from public.entry_reminders),0,'partner cannot read personal reminder');
insert into entry_tap_results select ok(not private.can_access_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'unverified moment binary hidden from partner');
insert into entry_tap_results select lives_ok($$select public.set_entry_reminder(null,'73000000-0000-4000-8000-000000000001',now()+interval '1 day')$$,'partner can schedule own moment reminder');
perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000003',true);
insert into entry_tap_results select is((select count(*)::int from public.entry_comments),0,'foreign comments hidden');
insert into entry_tap_results select is((select count(*)::int from public.milestone_media),0,'foreign moment media hidden');
insert into entry_tap_results select throws_ok($$select public.set_entry_reminder(null,'73000000-0000-4000-8000-000000000001',now()+interval '1 day')$$,'42501',null,'foreign reminder denied');
reset role;
update public.milestone_media set state='ready' where id='74000000-0000-4000-8000-000000000001';
set local role authenticated;
perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select ok(private.can_access_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'partner reads verified moment');
reset role;
update public.entry_reminders set due_at=now()-interval '1 minute' where user_id in ('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
perform private.deliver_entry_reminders(100);
insert into entry_tap_results select is((select count(*)::int from public.notifications where recipient_id in ('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002') and idempotency_key like 'entry-reminder:%'),2,'worker delivers memory and moment notifications');
insert into entry_tap_results select is((select count(*)::int from public.notifications where recipient_id in ('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002') and idempotency_key like 'entry-reminder:%' and title in ('A memory date is coming up','A moment is coming up')),2,'notification titles contain no private content');
perform private.deliver_entry_reminders(100);
insert into entry_tap_results select is((select count(*)::int from public.notifications where recipient_id in ('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002') and idempotency_key like 'entry-reminder:%'),2,'worker retry is idempotent');
update public.notification_preferences set memories_enabled=false where user_id='70000000-0000-4000-8000-000000000001';
update public.entry_reminders set id=gen_random_uuid(),state='pending' where user_id='70000000-0000-4000-8000-000000000001';
perform private.deliver_entry_reminders(100);
insert into entry_tap_results select is((select count(*)::int from public.notifications where recipient_id='70000000-0000-4000-8000-000000000001' and idempotency_key like 'entry-reminder:%'),1,'disabled category suppresses reminder notification');
update public.entry_reminders set id=gen_random_uuid(),state='pending' where user_id='70000000-0000-4000-8000-000000000002';
update public.couple_memberships set left_at=now() where user_id='70000000-0000-4000-8000-000000000002';
perform private.deliver_entry_reminders(100);
insert into entry_tap_results select is((select state from public.entry_reminders where user_id='70000000-0000-4000-8000-000000000002'),'cancelled','former partner reminder cancelled');
set local role authenticated;
perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into entry_tap_results select is((select count(*)::int from public.entry_comments),0,'former partner comments hidden');
insert into entry_tap_results select ok(not private.can_access_milestone_object('71000000-0000-4000-8000-000000000001/73000000-0000-4000-8000-000000000001/74000000-0000-4000-8000-000000000001/original'),'former partner binary denied');
reset role;
set local role anon;
insert into entry_tap_results select throws_ok($$select * from public.entry_comments$$,'42501',null,'anonymous comments denied');
insert into entry_tap_results select throws_ok($$select * from public.entry_reminders$$,'42501',null,'anonymous reminders denied');
insert into entry_tap_results select throws_ok($$select * from public.milestone_media$$,'42501',null,'anonymous moment media denied');
reset role;


select string_agg(result,E'\n') into failures from entry_tap_results where result like 'not ok%';
select count(*) into assertion_count from entry_tap_results;
if failures is not null then raise exception '%',failures;end if;
raise exception using errcode='P6008',message='Entry assertions passed; rollback fixtures';
exception when sqlstate 'P6008' then null;
end;
if assertion_count<>36 then raise exception 'Incomplete assertion run';end if;
if exists(select 1 from auth.users where id::text like '70000000-%') or exists(select 1 from public.couples where id::text like '71000000-%') or to_regclass('pg_temp.entry_tap_results') is not null then raise exception 'Fixture rollback failed';end if;
end $verify$;