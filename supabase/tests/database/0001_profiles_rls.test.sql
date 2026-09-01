begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_table('public', 'profiles', 'profiles table exists');
select col_is_pk('public', 'profiles', 'user_id', 'profile owner is the primary key');
select policies_are(
  'public',
  'profiles',
  array['profiles_insert_own', 'profiles_select_own', 'profiles_update_own'],
  'profiles has only the intended owner policies'
);
select table_privs_are(
  'public',
  'profiles',
  'anon',
  array[]::text[],
  'anonymous users have no profile table privileges'
);
select table_privs_are(
  'public',
  'profiles',
  'authenticated',
  array['INSERT', 'SELECT', 'UPDATE'],
  'authenticated users receive only the intended profile privileges'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya@example.test', '', now(), '{}', '{}', now(), now());

select is(
  (select count(*)::integer from public.profiles where user_id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  )),
  2,
  'auth trigger creates one profile per user'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'RLS exposes only the signed-in profile'
);

update public.profiles set display_name = 'Alex' where user_id = '00000000-0000-0000-0000-000000000001';
select is(
  (select display_name from public.profiles),
  'Alex',
  'owner can update their profile'
);

select throws_ok(
  $$insert into public.profiles (user_id) values ('00000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'user cannot insert a profile for another account'
);

reset role;

select * from finish();
rollback;
