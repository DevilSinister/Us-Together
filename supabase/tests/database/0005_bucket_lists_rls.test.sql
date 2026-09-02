-- Fictional fixtures are rolled back. No real account is read or modified.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table bucket_tap_results(result text);
grant select,insert on bucket_tap_results to authenticated,anon;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('40000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bucket-a@example.test','',now(),'{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bucket-b@example.test','',now(),'{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bucket-c@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values
 ('41000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
 ('41000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003');
insert into public.couple_memberships(couple_id,user_id) values
 ('41000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
 ('41000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002'),
 ('41000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003');
insert into public.bucket_lists(id,couple_id,created_by,title) values
 ('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Test adventures'),
 ('42000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003','Other private list');
insert into public.bucket_list_items(id,couple_id,list_id,created_by,title) values
 ('43000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','A sunrise'),
 ('43000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000002','42000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003','Other idea');
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
insert into bucket_tap_results select is((select count(*)::integer from public.bucket_lists),1,'partner sees only their list');
insert into bucket_tap_results select is((select count(*)::integer from public.bucket_list_items),1,'partner sees only their idea');
insert into bucket_tap_results select lives_ok($$update public.bucket_list_items set title='Our sunrise' where id='43000000-0000-4000-8000-000000000001'$$,'partner can edit an idea');
insert into bucket_tap_results select throws_ok($$update public.bucket_list_items set created_by=auth.uid() where id='43000000-0000-4000-8000-000000000001'$$,'42501',null,'creator is immutable');
insert into bucket_tap_results select throws_ok($$update public.bucket_list_items set list_id='42000000-0000-4000-8000-000000000002' where id='43000000-0000-4000-8000-000000000001'$$,'23514',null,'cannot move to another couple list');
insert into bucket_tap_results select throws_ok($$insert into public.bucket_list_items(couple_id,list_id,title) values('41000000-0000-4000-8000-000000000002','42000000-0000-4000-8000-000000000002','Intrusion')$$,'23514',null,'cross-couple insert denied');
insert into public.bucket_item_subtasks(id,item_id,label,position) values
 ('44000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000001','First',0),
 ('44000000-0000-4000-8000-000000000002','43000000-0000-4000-8000-000000000001','Second',1);
insert into bucket_tap_results select is((select version from public.bucket_list_items where id='43000000-0000-4000-8000-000000000001'),3,'child writes advance parent revision');
insert into bucket_tap_results select throws_ok($$select public.mutate_bucket_subtask('43000000-0000-4000-8000-000000000001',0,'reorder',null,'',false,array['44000000-0000-4000-8000-000000000002','44000000-0000-4000-8000-000000000001']::uuid[])$$,'40001',null,'stale reorder rejected');
insert into bucket_tap_results select lives_ok($$select public.mutate_bucket_subtask('43000000-0000-4000-8000-000000000001',3,'reorder',null,'',false,array['44000000-0000-4000-8000-000000000002','44000000-0000-4000-8000-000000000001']::uuid[])$$,'valid reorder swaps positions atomically');
insert into bucket_tap_results select is((select label from public.bucket_item_subtasks where item_id='43000000-0000-4000-8000-000000000001' and position=0),'Second','new order persisted');
insert into bucket_tap_results select throws_ok($$select public.mutate_bucket_subtask('43000000-0000-4000-8000-000000000001',(select version from public.bucket_list_items where id='43000000-0000-4000-8000-000000000001'),'reorder',null,'',false,array['44000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000001']::uuid[])$$,'23514',null,'duplicate or missing reorder IDs denied');
insert into bucket_tap_results select throws_ok($$select public.mutate_bucket_subtask('43000000-0000-4000-8000-000000000002',0,'add',null,'Intrusion')$$,'P0002',null,'foreign item RPC denied');
insert into bucket_tap_results select throws_ok($$update public.bucket_item_subtasks set item_id='43000000-0000-4000-8000-000000000002' where id='44000000-0000-4000-8000-000000000001'$$,'42501',null,'child cannot be reparented');
insert into bucket_tap_results select lives_ok($$select public.mutate_bucket_subtask('43000000-0000-4000-8000-000000000001',(select version from public.bucket_list_items where id='43000000-0000-4000-8000-000000000001'),'update','44000000-0000-4000-8000-000000000001','First done',true)$$,'subtask edit and completion saved');
insert into bucket_tap_results select is((select count(*)::integer from public.bucket_item_subtasks where is_completed),1,'progress counts completed subtasks');
insert into bucket_tap_results select throws_ok($$select public.delete_empty_bucket_list('42000000-0000-4000-8000-000000000001')$$,'23514',null,'populated list deletion denied');
insert into bucket_tap_results select throws_ok($$select public.create_plan_from_bucket('43000000-0000-4000-8000-000000000002','No',null,'date',now(),null,'UTC',null,null,null)$$,'P0002',null,'cross-couple conversion denied');
insert into bucket_tap_results select lives_ok($$select public.create_plan_from_bucket('43000000-0000-4000-8000-000000000001','Sunrise',null,'date',now(),null,'UTC',null,null,null)$$,'plan conversion succeeds');
insert into bucket_tap_results select lives_ok($$select public.create_plan_from_bucket('43000000-0000-4000-8000-000000000001','Repeated',null,'date',now(),null,'UTC',null,null,null)$$,'plan conversion retry succeeds');
insert into bucket_tap_results select is((select count(*)::integer from public.plans where source_bucket_item_id='43000000-0000-4000-8000-000000000001'),1,'only one plan per source');
insert into bucket_tap_results select is((select status from public.bucket_list_items where id='43000000-0000-4000-8000-000000000001'),'planned','conversion updates source status');
insert into bucket_tap_results select throws_ok($$select public.create_memory_from_bucket('43000000-0000-4000-8000-000000000001','Too soon',null,current_date,null,null,false)$$,'23514',null,'memory requires completed source');
update public.bucket_list_items set status='completed' where id='43000000-0000-4000-8000-000000000001';
insert into bucket_tap_results select is((select completed_by from public.bucket_list_items where id='43000000-0000-4000-8000-000000000001'),auth.uid(),'completion actor is authenticated user');
insert into bucket_tap_results select lives_ok($$select public.create_memory_from_bucket('43000000-0000-4000-8000-000000000001','Sunrise memory',null,current_date,null,null,false)$$,'completed idea creates a memory');
insert into bucket_tap_results select lives_ok($$select public.create_memory_from_bucket('43000000-0000-4000-8000-000000000001','Retry',null,current_date,null,null,false)$$,'memory retry succeeds');
insert into bucket_tap_results select is((select count(*)::integer from public.memories where source_bucket_item_id='43000000-0000-4000-8000-000000000001'),1,'memory retry does not duplicate');
insert into bucket_tap_results select lives_ok($$delete from public.bucket_list_items where id='43000000-0000-4000-8000-000000000001'$$,'deleting idea removes its subtasks safely');
insert into bucket_tap_results select is((select count(*)::integer from public.plans where title='Sunrise' and source_bucket_item_id is null),1,'plan survives source deletion');
insert into bucket_tap_results select is((select count(*)::integer from public.memories where title='Sunrise memory' and source_bucket_item_id is null),1,'memory survives source deletion');
insert into bucket_tap_results select lives_ok($$select public.delete_empty_bucket_list('42000000-0000-4000-8000-000000000001')$$,'empty list can be deleted');
reset role;
update public.couple_memberships set left_at=now() where user_id='40000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
insert into bucket_tap_results select is((select count(*)::integer from public.plans),0,'former member loses shared access');
reset role;
insert into bucket_tap_results select table_privs_are('public','bucket_list_items','anon',array[]::text[],'anonymous has no bucket table privileges');
insert into bucket_tap_results select ok(not has_function_privilege('anon','public.mutate_bucket_subtask(uuid,integer,text,uuid,text,boolean,uuid[])','EXECUTE'),'anonymous cannot mutate steps');
insert into bucket_tap_results select * from finish();
select result from bucket_tap_results;
rollback;
