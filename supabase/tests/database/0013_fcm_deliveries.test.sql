-- FCM delivery fan-out, isolation and settlement. All fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table fcm_tap_results(result text);
grant select,insert on fcm_tap_results to authenticated,anon;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fcm-a@example.test','',now(),'{}','{}',now(),now()),
('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fcm-b@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
insert into public.couple_memberships(couple_id,user_id) values
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001'),
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002');
-- Only A has an Android device.
insert into public.drawing_devices(token,user_id) values(repeat('t',40),'a0000000-0000-4000-8000-000000000001');

insert into public.notifications(id,recipient_id,couple_id,category,title,target_type,target_id,idempotency_key) values
('a2000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','drawing','A drawing was sent','drawing','a3000000-0000-4000-8000-000000000001','fcm-test-1'),
('a2000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','drawing','A drawing was sent','drawing','a3000000-0000-4000-8000-000000000002','fcm-test-2');

insert into fcm_tap_results select is((select count(*)::int from public.fcm_deliveries where notification_id='a2000000-0000-4000-8000-000000000001'),1,'recipient with a device gets exactly one delivery');
insert into fcm_tap_results select is((select count(*)::int from public.fcm_deliveries where notification_id='a2000000-0000-4000-8000-000000000002'),0,'recipient without a device gets none');
insert into fcm_tap_results select is((select state from public.fcm_deliveries where notification_id='a2000000-0000-4000-8000-000000000001'),'pending','new delivery starts pending');

-- Worker is dormant without Vault secrets.
insert into fcm_tap_results select is(private.dispatch_due_fcm(50),0,'dispatch is a no-op without fcm_endpoint_url');

-- Settlement outcomes.
select public.settle_fcm_deliveries(jsonb_build_object('results',jsonb_build_array(jsonb_build_object('deliveryId',(select id from public.fcm_deliveries limit 1),'outcome','failed'))));
insert into fcm_tap_results select is((select state||'/'||attempts||'/'||coalesce(last_error_code,'') from public.fcm_deliveries limit 1),'pending/0/delivery_failed','failed outcome stays pending for retry');
select public.settle_fcm_deliveries(jsonb_build_object('results',jsonb_build_array(jsonb_build_object('deliveryId',(select id from public.fcm_deliveries limit 1),'outcome','delivered'))));
insert into fcm_tap_results select is((select state from public.fcm_deliveries limit 1),'delivered','delivered outcome is recorded');
select public.settle_fcm_deliveries(jsonb_build_object('results',jsonb_build_array(jsonb_build_object('deliveryId',(select id from public.fcm_deliveries limit 1),'outcome','gone'))));
insert into fcm_tap_results select is((select count(*)::int from public.drawing_devices),0,'gone outcome removes the dead device');
insert into fcm_tap_results select is((select count(*)::int from public.fcm_deliveries),0,'device removal cascades its deliveries');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into fcm_tap_results select throws_ok($$select * from public.fcm_deliveries$$,'42501',null,'application role cannot read delivery bookkeeping');
insert into fcm_tap_results select throws_ok($$select public.settle_fcm_deliveries('{}'::jsonb)$$,'42501',null,'application role cannot settle deliveries');
insert into fcm_tap_results select throws_ok($$select private.dispatch_due_fcm(1)$$,'42501',null,'application role cannot dispatch');
reset role;
set local role anon;
insert into fcm_tap_results select throws_ok($$select public.settle_fcm_deliveries('{}'::jsonb)$$,'42501',null,'anonymous cannot settle deliveries');
reset role;
insert into fcm_tap_results select ok((select count(*) from cron.job where jobname='us-together-fcm-dispatch')=1,'dispatch cron job is scheduled');
select result from fcm_tap_results;
select * from finish();
rollback;
