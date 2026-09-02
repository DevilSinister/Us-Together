begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_column('public', 'couple_invitations', 'attempt_count', 'invite attempts are tracked');
select has_table('private', 'pairing_attempt_limits', 'account pairing attempts are tracked privately');
select is(
  (select prosecdef from pg_proc where oid = 'public.join_couple_by_code(text)'::regprocedure),
  false,
  'public pairing RPC is security invoker'
);
select isnt(has_function_privilege('anon', 'public.join_couple_by_code(text)', 'EXECUTE'), true, 'anonymous cannot call pairing RPC');
select table_privs_are('public', 'couple_invitations', 'authenticated', array[]::text[], 'invitations remain RPC-only');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex-pairing@example.test', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya-pairing@example.test', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-pairing@example.test', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'capacity-pairing@example.test', '', now(), '{}', '{}', now(), now());
update public.profiles set display_name = case user_id
  when '30000000-0000-0000-0000-000000000001' then 'Alex'
  when '30000000-0000-0000-0000-000000000002' then 'Maya'
  else 'Test partner'
end where user_id::text like '30000000-%';

insert into public.couples (id, created_by) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');
insert into public.couple_memberships (couple_id, user_id) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');
insert into public.couple_invitations (couple_id, created_by, code_hash, expires_at) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', extensions.digest('123456', 'sha256'), now() + interval '30 minutes'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', extensions.digest('654321', 'sha256'), now() + interval '30 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.profiles), 1, 'unpaired user sees only their profile');
select is(public.join_couple_by_code('123456'), '31000000-0000-0000-0000-000000000001'::uuid, 'valid code connects second partner');
select is((select count(*)::integer from public.profiles), 2, 'connected partner profiles are mutually visible');
select is((select display_name from public.profiles where user_id = '30000000-0000-0000-0000-000000000002'), 'Maya', 'connected partner fixture has a named profile');

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000004', true);
select is(public.join_couple_by_code('123456'), null, 'used invitation cannot exceed two-partner capacity');
select is(public.join_couple_by_code('000001'), null, 'first invalid attempt is generic');
select is(public.join_couple_by_code('000002'), null, 'second invalid attempt is generic');
select is(public.join_couple_by_code('000003'), null, 'third invalid attempt is generic');
select is(public.join_couple_by_code('000004'), null, 'fourth invalid attempt is generic');
select is(public.join_couple_by_code('000005'), null, 'fifth invalid attempt is generic');
select is(public.join_couple_by_code('000006'), null, 'further attempts remain generic while blocked');
reset role;
select ok((select blocked_until > now() from private.pairing_attempt_limits where user_id = '30000000-0000-0000-0000-000000000004'), 'account limiter blocks repeated attempts');

insert into public.plans (couple_id, created_by, type, title, starts_at, originating_timezone)
values ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'date', 'Shared dinner', now() + interval '1 day', 'UTC');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select ok(public.leave_current_couple(), 'connected partner can leave');
select is((select count(*)::integer from public.profiles), 1, 'departing partner immediately loses partner profile access');
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.plans), 1, 'shared data remains for the continuing partner');
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select ok(public.revoke_pairing_invite(), 'invite creator can revoke active invite');
select ok(public.delete_empty_couple(), 'sole member can delete an empty unpaired couple');
reset role;
select is((select count(*)::integer from public.couples where id = '31000000-0000-0000-0000-000000000002'), 0, 'empty couple and its invitation are removed');

select * from finish();
rollback;
