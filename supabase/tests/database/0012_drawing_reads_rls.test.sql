-- drawing_reads authorization matrix. All fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table read_tap_results(result text);
grant select,insert on read_tap_results to authenticated,anon;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','read-a@example.test','',now(),'{}','{}',now(),now()),
('90000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','read-b@example.test','',now(),'{}','{}',now(),now()),
('90000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','read-c@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001'),
('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');
insert into public.couple_memberships(couple_id,user_id) values
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001'),
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002'),
('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');

-- A ready drawing from A to B, and a pending one that must not be markable.
insert into public.drawing_notes(id,couple_id,author_id,recipient_id,object_path) values
('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000001.png'),
('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000002.png');
insert into storage.objects(bucket_id,name) values('drawing-notes','90000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000001.png');
update public.drawing_notes set status='ready' where id='92000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
insert into public.drawing_reads(drawing_id) values('92000000-0000-4000-8000-000000000001');
insert into read_tap_results select is((select count(*)::int from public.drawing_reads),1,'recipient marks a ready drawing read');
insert into public.drawing_reads(drawing_id) values('92000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into read_tap_results select is((select count(*)::int from public.drawing_reads),1,'second read is a no-op without UPDATE privilege');
insert into read_tap_results select throws_ok(
  $$insert into public.drawing_reads(drawing_id) values('92000000-0000-4000-8000-000000000002')$$,
  '42501',null,'recipient cannot mark a pending drawing');
insert into read_tap_results select throws_ok(
  $$insert into public.drawing_reads(drawing_id,user_id) values('92000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001')$$,
  '42501',null,'recipient cannot write a row for another user');

select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
insert into read_tap_results select is((select count(*)::int from public.drawing_reads),0,'author cannot see the recipient read row');
insert into read_tap_results select throws_ok(
  $$insert into public.drawing_reads(drawing_id) values('92000000-0000-4000-8000-000000000001')$$,
  '42501',null,'author cannot mark their own drawing read');

select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
insert into read_tap_results select throws_ok(
  $$insert into public.drawing_reads(drawing_id) values('92000000-0000-4000-8000-000000000001')$$,
  '42501',null,'foreign user cannot mark a drawing read');
insert into read_tap_results select is((select count(*)::int from public.drawing_reads),0,'foreign user sees no read rows');

reset role;
set local role anon;
insert into read_tap_results select throws_ok($$select * from public.drawing_reads$$,'42501',null,'anonymous read-state denied');
reset role;
insert into read_tap_results select ok((select count(*) from pg_indexes where schemaname='public' and indexname='notes_couple_updated_idx')=1,'notes keyset index exists');
select result from read_tap_results;
select * from finish();
rollback;
