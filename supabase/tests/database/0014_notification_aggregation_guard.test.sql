-- Isolated temporary-table guard regressions; no production fixture rows/accounts.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(5);
create temporary table notification_guard_fixture (like public.notifications including defaults);
create temporary table notification_guard_source (id integer primary key, tamper boolean default false);
create temporary table notification_guard_results (name text, passed boolean);
grant select,update on notification_guard_fixture,notification_guard_source to authenticated;
grant insert on notification_guard_results to authenticated;
insert into notification_guard_fixture(id,recipient_id,category,title,idempotency_key)
values ('b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','memory','Test photo','guard-fixture');
insert into notification_guard_source(id) values(1);
create trigger test_notification_guard before update on notification_guard_fixture
for each row execute function private.validate_notification_update();
create function pg_temp.test_notification_aggregate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.tamper then
  update pg_temp.notification_guard_fixture set recipient_id='b0000000-0000-4000-8000-000000000003';
 else
  update pg_temp.notification_guard_fixture set title='2 test photos',activity_count=activity_count+1,created_at=now();
 end if;
 return new;
end $$;
revoke all on function pg_temp.test_notification_aggregate() from public,anon,authenticated;
create trigger test_nested_aggregate after update on notification_guard_source for each row execute function pg_temp.test_notification_aggregate();
set local role authenticated;
update notification_guard_fixture set read_at=now();
insert into notification_guard_results values('recipient read-state update',true);
do $$
begin
 begin update pg_temp.notification_guard_fixture set title='Forged'; raise exception 'title forgery accepted'; exception when insufficient_privilege then null; end;
 begin update pg_temp.notification_guard_fixture set activity_count=9; raise exception 'count forgery accepted'; exception when insufficient_privilege then null; end;
 begin update pg_temp.notification_guard_fixture set recipient_id='b0000000-0000-4000-8000-000000000003'; raise exception 'identity forgery accepted'; exception when insufficient_privilege then null; end;
 insert into pg_temp.notification_guard_results values('authenticated title/count/identity forgery denied',true);
end $$;
update notification_guard_source set tamper=false;
insert into notification_guard_results select 'nested trusted aggregation', title='2 test photos' and activity_count=2 from notification_guard_fixture;
do $$
begin
 begin update pg_temp.notification_guard_source set tamper=true; raise exception 'nested identity forgery accepted'; exception when insufficient_privilege then null; end;
 insert into pg_temp.notification_guard_results values('nested trusted identity forgery denied',true);
end $$;
reset role;
do $$
begin
 begin update pg_temp.notification_guard_fixture set title='Direct privileged rewrite'; raise exception 'direct privileged rewrite accepted'; exception when insufficient_privilege then null; end;
 insert into pg_temp.notification_guard_results values('direct privileged aggregation denied',true);
end $$;
select ok(passed,name) from notification_guard_results;
select * from finish();
rollback;
