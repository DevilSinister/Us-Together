begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_table('public', 'milestones', 'milestones table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'notification_preferences', 'notification preferences table exists');
select policies_are('public', 'milestones', array['milestones_delete_member', 'milestones_insert_member', 'milestones_select_member', 'milestones_update_member'], 'milestones have operation-specific member policies');
select policies_are('public', 'notifications', array['notifications_delete_recipient', 'notifications_select_recipient', 'notifications_update_recipient'], 'notifications are recipient-owned');
select policies_are('public', 'notification_preferences', array['notification_preferences_insert_own', 'notification_preferences_select_own', 'notification_preferences_update_own'], 'preferences are user-owned');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex-dashboard@example.test', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya-dashboard@example.test', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-dashboard@example.test', '', now(), '{}', '{}', now(), now());
insert into public.couples (id, created_by, relationship_started_on) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', current_date - 100),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', current_date - 10);
insert into public.couple_memberships (couple_id, user_id) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');
insert into public.milestones (id, couple_id, created_by, type, title, milestone_date, is_featured) values
  ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'relationship', 'Our beginning', current_date - 100, true),
  ('32000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'custom', 'Other milestone', current_date, false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.milestones), 1, 'partner sees only their couple milestone');
select is((select count(*)::integer from public.notifications), 1, 'partner sees only their generic notification');
select is((select title from public.notifications limit 1), 'A milestone was added', 'notification does not copy private milestone content');
select lives_ok($$update public.milestones set title = 'Our beginning, together' where id = '32000000-0000-0000-0000-000000000001'$$, 'either active partner can update a shared milestone');
select lives_ok($$update public.notifications set read_at = now()$$, 'recipient can mark a notification read');
select throws_ok($$update public.notifications set title = 'Changed'$$, '42501', null, 'recipient cannot rewrite notification content');
select is((select count(*)::integer from public.notification_preferences), 1, 'user sees only their own preferences');
select throws_ok($$insert into public.milestones (couple_id, type, title, milestone_date) values ('31000000-0000-0000-0000-000000000002', 'custom', 'Intrusion', current_date)$$, '42501', null, 'member cannot create a milestone for another couple');
update public.notification_preferences set milestones_enabled = false where user_id = '30000000-0000-0000-0000-000000000002';

reset role;
insert into public.milestones (id, couple_id, created_by, type, title, milestone_date) values
  ('32000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'achievement', 'A private achievement', current_date);
select is((select count(*)::integer from public.notifications where recipient_id = '30000000-0000-0000-0000-000000000002'), 1, 'disabled category prevents later notification fan-out');
update public.couple_memberships set left_at = now() where user_id = '30000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.milestones), 0, 'former member cannot see milestones');
select is((select count(*)::integer from public.notifications), 0, 'former member cannot see couple notifications');
reset role;
select table_privs_are('public', 'notifications', 'anon', array[]::text[], 'anonymous has no notification privileges');
select table_privs_are('public', 'notification_preferences', 'anon', array[]::text[], 'anonymous has no preference privileges');
select * from finish();
rollback;
