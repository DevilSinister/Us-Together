-- Drawing-note authorization matrix. All fixtures and Storage metadata roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table drawing_tap_results(result text);
grant select,insert on drawing_tap_results to authenticated,anon;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('80000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','draw-a@example.test','',now(),'{}','{}',now(),now()),
('80000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','draw-b@example.test','',now(),'{}','{}',now(),now()),
('80000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','draw-c@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values
('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001'),
('81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003');
insert into public.couple_memberships(couple_id,user_id) values
('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001'),
('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002'),
('81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
insert into public.drawing_notes(id,couple_id,recipient_id,object_path) values
('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001',
 '80000000-0000-4000-8000-000000000002',
 '80000000-0000-4000-8000-000000000001/82000000-0000-4000-8000-000000000001.png');
insert into drawing_tap_results select is((select count(*)::int from public.drawing_notes),1,'author can see pending drawing');
insert into drawing_tap_results select throws_ok(
  $$update public.drawing_notes set status='ready' where id='82000000-0000-4000-8000-000000000001'$$,
  '23514',null,'drawing cannot publish before upload');
insert into drawing_tap_results select throws_ok(
  $$insert into public.drawing_notes(id,couple_id,recipient_id,object_path) values
  ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001',
   '80000000-0000-4000-8000-000000000003',
   '80000000-0000-4000-8000-000000000001/82000000-0000-4000-8000-000000000002.png')$$,
  '42501',null,'foreign recipient denied');
insert into public.drawing_devices(token) values(repeat('a',40));
insert into drawing_tap_results select is((select count(*)::int from public.drawing_devices),1,'device owner sees token');
-- Storage metadata is a rollback-only RLS fixture. Binary Storage API is tested separately.
insert into storage.objects(bucket_id,name) values
('drawing-notes','80000000-0000-4000-8000-000000000001/82000000-0000-4000-8000-000000000001.png');
update public.drawing_notes set status='ready' where id='82000000-0000-4000-8000-000000000001';
insert into drawing_tap_results select is((select count(*)::int from public.drawing_notes where status='ready'),1,'author publishes once');
insert into drawing_tap_results select throws_ok(
  $$update public.drawing_notes set status='pending' where id='82000000-0000-4000-8000-000000000001'$$,
  '42501',null,'sent drawing is immutable');
with removed as(delete from public.drawing_notes where id='82000000-0000-4000-8000-000000000001' returning id)
insert into drawing_tap_results select is(count(*)::int,0,'sent drawing cannot be deleted');

select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
insert into drawing_tap_results select is((select count(*)::int from public.drawing_notes),1,'recipient reads ready drawing');
insert into drawing_tap_results select is((select count(*)::int from storage.objects where bucket_id='drawing-notes'),1,'recipient reads only authorized image metadata');
insert into drawing_tap_results select is((select count(*)::int from public.drawing_devices),0,'partner cannot read device token');
with modified as(update public.drawing_notes set status='ready' where id='82000000-0000-4000-8000-000000000001' returning id)
insert into drawing_tap_results select is(count(*)::int,0,'recipient cannot revise drawing');

select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
insert into drawing_tap_results select is((select count(*)::int from public.drawing_notes),0,'foreign user cannot read drawing');
insert into drawing_tap_results select is((select count(*)::int from storage.objects where bucket_id='drawing-notes'),0,'foreign user cannot read image metadata');
insert into drawing_tap_results select is((select count(*)::int from public.drawing_devices),0,'foreign user cannot read device token');
reset role;
update public.couple_memberships set left_at=now() where user_id='80000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
insert into drawing_tap_results select is((select count(*)::int from public.drawing_notes),0,'former partner loses drawing access');
insert into drawing_tap_results select is((select count(*)::int from storage.objects where bucket_id='drawing-notes'),0,'former partner loses image access');
reset role;
set local role anon;
insert into drawing_tap_results select throws_ok($$select * from public.drawing_notes$$,'42501',null,'anonymous drawing read denied');
insert into drawing_tap_results select throws_ok($$select * from public.drawing_devices$$,'42501',null,'anonymous device read denied');
reset role;
select result from drawing_tap_results;
select * from finish();
rollback;
