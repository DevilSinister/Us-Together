begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_table('public', 'plans', 'plans table exists');
select has_table('public', 'memories', 'memories table exists');
select has_table('public', 'memory_media', 'memory media metadata exists');
select policies_are('public', 'plans', array['plans_delete_member', 'plans_insert_member', 'plans_select_member', 'plans_update_member'], 'plans have operation-specific member policies');
select policies_are('public', 'memories', array['memories_delete_member', 'memories_insert_member', 'memories_select_member', 'memories_update_member'], 'memories have operation-specific member policies');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex-plans@example.test', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya-plans@example.test', '', now(), '{}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-plans@example.test', '', now(), '{}', '{}', now(), now());
insert into public.couples (id, created_by) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
insert into public.couple_memberships (couple_id, user_id) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
insert into public.plans (id, couple_id, created_by, type, title, starts_at, originating_timezone) values
  ('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'date', 'Shared dinner', now() + interval '1 day', 'UTC'),
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'trip', 'Other trip', now() + interval '2 days', 'UTC');
update public.plans set status='completed',completed_by=created_by,completed_at=now() where id in ('12000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001');
insert into public.memories (id, couple_id, created_by, source_plan_id, title, memory_date) values
  ('13000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Dinner together', current_date),
  ('24000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Other memory', current_date);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.plans), 1, 'partner sees only their couple plan');
select is((select count(*)::integer from public.memories), 1, 'partner sees only their couple memory');
update public.plans set title = 'Our dinner' where id = '12000000-0000-0000-0000-000000000001';
select is((select title from public.plans where id = '12000000-0000-0000-0000-000000000001'), 'Our dinner', 'partner can update shared plan');
select throws_ok($$insert into public.plans (couple_id, created_by, type, title, starts_at, originating_timezone) values ('22000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'date', 'Intrusion', now(), 'UTC')$$, '42501', null, 'member cannot insert into another couple');
select throws_ok($$update public.plans set couple_id = '22000000-0000-0000-0000-000000000001' where id = '12000000-0000-0000-0000-000000000001'$$, '42501', null, 'plan tenant key cannot be reassigned');
select throws_ok($$update public.memories set created_by = '10000000-0000-0000-0000-000000000002' where id = '13000000-0000-0000-0000-000000000001'$$, '42501', null, 'memory creator cannot be reassigned');
select isnt(private.can_access_memory_object('11000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/photo.jpg'), true, 'unallocated matching memory path is denied');
select isnt(private.can_access_memory_object('22000000-0000-0000-0000-000000000001/24000000-0000-0000-0000-000000000001/photo.jpg'), true, 'member cannot access another couple path');
select isnt(private.can_access_memory_object('not-a-uuid/path/photo.jpg'), true, 'malformed path is rejected safely');
select isnt(private.is_active_couple_member('22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'), true, 'membership helper cannot probe another user');
reset role;
select table_privs_are('public', 'plans', 'anon', array[]::text[], 'anonymous has no plan privileges');
select table_privs_are('public', 'memories', 'anon', array[]::text[], 'anonymous has no memory privileges');
select * from finish();
rollback;
