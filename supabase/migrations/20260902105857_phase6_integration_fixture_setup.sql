-- Temporary, isolated integration fixtures. Cleanup is paired with phase6_integration_fixture_cleanup.
-- Passwords are generated at execution time, never embedded in migration source.
create table private.phase6_test_fixture(user_id uuid primary key,email text not null,password text not null,couple_id uuid not null,memory_id uuid not null,position integer not null);
alter table private.phase6_test_fixture enable row level security;
revoke all on private.phase6_test_fixture from public,anon,authenticated,service_role;
do $fixtures$
declare u uuid; c uuid; m uuid; first_c uuid; first_m uuid; e text; p text;
begin
 for i in 0..2 loop
  u:=gen_random_uuid();e:='phase6-'||u::text||'@example.test';p:='Aa1!'||gen_random_uuid()::text;
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,phone_change,phone_change_token,reauthentication_token)
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',e,extensions.crypt(p,extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','','','','','');
  insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at) values(gen_random_uuid(),u::text,u,jsonb_build_object('sub',u,'email',e,'email_verified',true),'email',now(),now());
  update public.profiles set display_name='Media fixture',onboarding_completed=true,timezone='UTC' where user_id=u;
  if i<>1 then
   c:=gen_random_uuid();m:=gen_random_uuid();
   insert into public.couples(id,created_by) values(c,u);
   if i=0 then first_c:=c;first_m:=m;end if;
  else c:=first_c;m:=first_m;end if;
  insert into public.couple_memberships(couple_id,user_id) values(c,u);
  if i<>1 then insert into public.memories(id,couple_id,created_by,title,memory_date) values(m,c,u,'Fictional media verification','2026-08-20');end if;
  insert into private.phase6_test_fixture values(u,e,p,c,m,i);
 end loop;
end $fixtures$;
