-- Hosted verification gate for Phase 7. Fixtures and the temporary pgTAP installation
-- always roll back. Fictional accounts only; no real account is read or modified.
--
-- The exit gate for this phase is an inference test, not a feature test: the wishlist
-- owner must not detect a purchase secret through any channel, and the partner must not
-- detect an author-private note through any channel.
DO $verify$
DECLARE failures text;
BEGIN
  BEGIN
    EXECUTE $suite$

create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table phase7_tap_results(result text);
grant select,insert on phase7_tap_results to authenticated,anon;

-- owner=1 and partner=2 share couple 1. User 3 belongs to an unrelated couple.
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wish-owner@example.test','',now(),'{}','{}',now(),now()),
 ('90000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wish-partner@example.test','',now(),'{}','{}',now(),now()),
 ('90000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wish-stranger@example.test','',now(),'{}','{}',now(),now());
insert into public.couples(id,created_by) values
 ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001'),
 ('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');
insert into public.couple_memberships(couple_id,user_id) values
 ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001'),
 ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002'),
 ('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');
insert into public.wishlist_items(id,couple_id,owner_id,title,priority) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','A winter coat','really_want'),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003','Unrelated wish','want');
insert into public.notes(id,couple_id,author_id,type,title,body) values
 ('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','private','Owner private note','ONLY-THE-AUTHOR-SEES-THIS'),
 ('94000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','shared','Owner shared note','Both of us can read this'),
 ('94000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003','shared','Unrelated note','Other couple');

-- ---------- the partner acting as purchaser ----------
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',true);

insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_items),1,'partner reads only their own space wishlist');
insert into phase7_tap_results select lives_ok($$insert into public.wishlist_purchase_secrets(id,wishlist_item_id,status,notes) values('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','planned','Ordered the navy one')$$,'partner may hold a purchase secret');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets),1,'purchaser reads their own secret');
insert into phase7_tap_results select is((select purchased_at from public.wishlist_purchase_secrets where id='93000000-0000-4000-8000-000000000001'),null,'planned status carries no purchase instant');
insert into phase7_tap_results select lives_ok($$update public.wishlist_purchase_secrets set status='purchased' where id='93000000-0000-4000-8000-000000000001'$$,'purchaser may advance status');
insert into phase7_tap_results select isnt((select purchased_at from public.wishlist_purchase_secrets where id='93000000-0000-4000-8000-000000000001'),null,'purchased status derives the instant in the database');
insert into phase7_tap_results select throws_ok($$update public.wishlist_purchase_secrets set purchaser_id='90000000-0000-4000-8000-000000000001' where id='93000000-0000-4000-8000-000000000001'$$,'42501',null,'purchaser is immutable');
insert into phase7_tap_results select throws_ok($$insert into public.wishlist_purchase_secrets(wishlist_item_id) values('92000000-0000-4000-8000-000000000002')$$,'42501',null,'cannot hold a secret for another couple item');
-- The partner may read a shared note but never the author's private one.
insert into phase7_tap_results select is((select count(*)::integer from public.notes),1,'partner reads only the shared note');
insert into phase7_tap_results select is((select count(*)::integer from public.notes where id='94000000-0000-4000-8000-000000000001'),0,'partner cannot reach a private note by its id');
insert into phase7_tap_results select is((select count(*)::integer from public.notes where body like '%ONLY-THE-AUTHOR%'),0,'private body is unreachable by content probe');
insert into phase7_tap_results select lives_ok($$update public.notes set title='Partner edit attempt' where id='94000000-0000-4000-8000-000000000002'$$,'a denied note update raises nothing');
insert into phase7_tap_results select lives_ok($$insert into public.note_reads(note_id) values('94000000-0000-4000-8000-000000000002')$$,'partner may record reading a shared note');
insert into phase7_tap_results select throws_ok($$insert into public.note_reads(note_id) values('94000000-0000-4000-8000-000000000001')$$,'42501',null,'cannot record reading an unreadable note');
reset role;
insert into phase7_tap_results select is((select title from public.notes where id='94000000-0000-4000-8000-000000000002'),'Owner shared note','the partner edit changed nothing');

-- ---------- the wishlist owner probing for the secret ----------
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets),0,'owner sees no purchase secret at all');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets where id='93000000-0000-4000-8000-000000000001'),0,'owner cannot reach the secret by its exact id');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets where wishlist_item_id='92000000-0000-4000-8000-000000000001'),0,'owner cannot reach the secret through their own item id');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_items item join public.wishlist_purchase_secrets secret on secret.wishlist_item_id=item.id),0,'owner cannot join their item to a secret');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets where status='purchased'),0,'owner cannot count by secret status');
insert into phase7_tap_results select is((select coalesce(max(purchased_at)::text,'none') from public.wishlist_purchase_secrets),'none','owner cannot aggregate a purchase instant');
insert into phase7_tap_results select throws_ok($$insert into public.wishlist_purchase_secrets(wishlist_item_id) values('92000000-0000-4000-8000-000000000001')$$,'42501',null,'owner cannot plant a probe secret on their own item');
insert into phase7_tap_results select lives_ok($$update public.wishlist_purchase_secrets set status='cancelled' where id='93000000-0000-4000-8000-000000000001'$$,'a denied secret update raises nothing');
insert into phase7_tap_results select lives_ok($$delete from public.wishlist_purchase_secrets where id='93000000-0000-4000-8000-000000000001'$$,'a denied secret delete raises nothing');
insert into phase7_tap_results select lives_ok($$insert into public.wishlist_items(id,couple_id,title) values('92000000-0000-4000-8000-000000000009','91000000-0000-4000-8000-000000000001','Throwaway')$$,'owner may add an item');
insert into phase7_tap_results select throws_ok($$update public.wishlist_items set owner_id='90000000-0000-4000-8000-000000000002' where id='92000000-0000-4000-8000-000000000001'$$,'42501',null,'wishlist owner is immutable');
insert into phase7_tap_results select throws_ok($$insert into public.wishlist_items(couple_id,title) values('91000000-0000-4000-8000-000000000002','Intrusion')$$,'42501',null,'cross-couple wishlist insert denied');
insert into phase7_tap_results select is((select count(*)::integer from public.notes),2,'author reads both their private and shared note');
reset role;
insert into phase7_tap_results select is((select status from public.wishlist_purchase_secrets where id='93000000-0000-4000-8000-000000000001'),'purchased','the owner attempts left the secret untouched');

-- ---------- deleting the item hides the cascade from the owner ----------
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into phase7_tap_results select lives_ok($$delete from public.wishlist_items where id='92000000-0000-4000-8000-000000000001'$$,'owner deletes their item without a restrict error');
reset role;
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets where id='93000000-0000-4000-8000-000000000001'),0,'the secret cascaded away with its item');

-- ---------- notifications carry visibility, never content ----------
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.notes(id,couple_id,type,title,body) values
 ('94000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000001','private','Second private','NEVER-NOTIFIED'),
 ('94000000-0000-4000-8000-000000000005','91000000-0000-4000-8000-000000000001','shared','Second shared','Announce me');
reset role;
insert into phase7_tap_results select is((select count(*)::integer from public.notifications where target_type='note' and target_id='94000000-0000-4000-8000-000000000004'),0,'a private note notifies nobody');
insert into phase7_tap_results select is((select count(*)::integer from public.notifications where target_type='note' and target_id='94000000-0000-4000-8000-000000000005'),1,'a shared note notifies the partner exactly once');
insert into phase7_tap_results select is((select recipient_id from public.notifications where target_type='note' and target_id='94000000-0000-4000-8000-000000000005'),'90000000-0000-4000-8000-000000000002'::uuid,'the author is not notified of their own note');
insert into phase7_tap_results select is((select title from public.notifications where target_type='note' and target_id='94000000-0000-4000-8000-000000000005'),'A shared note was added','the notification title is generic');
insert into phase7_tap_results select is((select count(*)::integer from public.notifications where title like '%Announce me%' or title like '%NEVER-NOTIFIED%'),0,'no note body reaches a notification title');

-- Withdrawing sharing withdraws the notification it produced.
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into phase7_tap_results select lives_ok($$update public.notes set type='private' where id='94000000-0000-4000-8000-000000000005'$$,'author may withdraw sharing');
insert into phase7_tap_results select throws_ok($$update public.notes set author_id='90000000-0000-4000-8000-000000000002' where id='94000000-0000-4000-8000-000000000002'$$,'42501',null,'note author is immutable');
reset role;
insert into phase7_tap_results select is((select count(*)::integer from public.notifications where target_type='note' and target_id='94000000-0000-4000-8000-000000000005'),0,'withdrawing sharing removes the partner notification');

-- ---------- an unrelated couple ----------
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
insert into phase7_tap_results select is((select count(*)::integer from public.notes where couple_id='91000000-0000-4000-8000-000000000001'),0,'a stranger reads no note from another couple');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_items where couple_id='91000000-0000-4000-8000-000000000001'),0,'a stranger reads no wishlist from another couple');
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_purchase_secrets),0,'a stranger holds no secrets');
reset role;

-- ---------- leaving the couple withdraws access ----------
update public.couple_memberships set left_at=now() where user_id='90000000-0000-4000-8000-000000000002' and couple_id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into phase7_tap_results select is((select count(*)::integer from public.wishlist_items),0,'a former member loses wishlist access');
insert into phase7_tap_results select is((select count(*)::integer from public.notes),0,'a former member loses note access');
reset role;

-- ---------- anonymous ----------
insert into phase7_tap_results select table_privs_are('public','wishlist_items','anon',array[]::text[],'anonymous has no wishlist privileges');
insert into phase7_tap_results select table_privs_are('public','wishlist_purchase_secrets','anon',array[]::text[],'anonymous has no purchase secret privileges');
insert into phase7_tap_results select table_privs_are('public','notes','anon',array[]::text[],'anonymous has no note privileges');
insert into phase7_tap_results select table_privs_are('public','note_reads','anon',array[]::text[],'anonymous has no note read privileges');
insert into phase7_tap_results select ok(not has_function_privilege('anon','private.can_hold_purchase_secret(uuid)','EXECUTE'),'anonymous cannot test purchase eligibility');
insert into phase7_tap_results select ok(not has_function_privilege('anon','private.can_receive_note(uuid,uuid)','EXECUTE'),'anonymous cannot test note recipients');
insert into phase7_tap_results select table_privs_are('public','note_reads','authenticated',array['SELECT','INSERT','DELETE'],'note reads are append or remove only');

insert into phase7_tap_results select * from finish();
select result from phase7_tap_results;

$suite$;
    SELECT string_agg(result,E'\n') INTO failures FROM phase7_tap_results WHERE result LIKE 'not ok%' OR result LIKE '# Looks like%';
    IF failures IS NOT NULL THEN RAISE EXCEPTION 'Phase 7 verification failed: %',failures; END IF;
    RAISE EXCEPTION USING ERRCODE='P7444', MESSAGE='Phase 7 assertions passed; roll back fixtures.';
  EXCEPTION WHEN SQLSTATE 'P7444' THEN NULL;
  END;
END
$verify$;
