-- Plan map details and bounded reminder retry state.
alter table public.plan_reminders add column next_attempt_at timestamptz;
alter table public.plan_reminders add column last_error_code text check (last_error_code is null or last_error_code='delivery_failed');
create or replace function private.guard_phase5_rows() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='plan_reminders' then
   if tg_op='INSERT' and (new.state<>'pending' or new.attempts<>0 or new.delivered_at is not null or new.next_attempt_at is not null or new.last_error_code is not null) then raise exception using errcode='42501',message='Reminder delivery state is server-managed.'; end if;
   if tg_op='UPDATE' and new.plan_id<>old.plan_id then raise exception using errcode='42501',message='Reminder parent is immutable.'; end if;
   if tg_op='UPDATE' and current_user in ('authenticated','anon') and (new.created_by<>old.created_by or new.delivery_key<>old.delivery_key or new.attempts<>old.attempts or new.delivered_at is distinct from old.delivered_at or new.next_attempt_at is distinct from old.next_attempt_at or new.last_error_code is distinct from old.last_error_code or new.state not in ('pending','cancelled')) then raise exception using errcode='42501',message='Reminder delivery state is server-managed.'; end if;
   if current_user in ('authenticated','anon') and new.state='pending' and not exists(select 1 from public.plans p where p.id=new.plan_id and p.status='planned' and new.due_at=p.starts_at-make_interval(mins=>new.offset_minutes) and new.due_at>now()) then raise exception using errcode='23514',message='Reminder must be a future instant relative to the plan.'; end if;
 elsif tg_table_name='plan_attachments' then
   if tg_op='UPDATE' and (new.plan_id<>old.plan_id or new.uploaded_by<>old.uploaded_by or new.object_path<>old.object_path or new.filename<>old.filename or new.mime_type<>old.mime_type or new.size_bytes<>old.size_bytes or old.ready) then raise exception using errcode='42501',message='Attachment metadata is immutable.'; end if;
 end if;
 return new;
end $$;

create or replace function public.update_plan_details(input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.plans; new_start timestamptz:=(input->>'starts_at')::timestamptz;
begin
 select * into p from public.plans where id=(input->>'planId')::uuid for update;
 if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
 if p.version is distinct from (input->>'version')::int then return jsonb_build_object('ok',false,'code','CONFLICT'); end if;
 if not exists(select 1 from pg_timezone_names where name=input->>'timezone') then raise exception using errcode='22023',message='Invalid timezone.'; end if;
 update public.plans set title=input->>'title',description=input->>'description',type=input->>'type',starts_at=new_start,ends_at=(input->>'ends_at')::timestamptz,originating_timezone=input->>'timezone',location=input->>'location',budget_minor=(input->>'budget_minor')::bigint,currency=input->>'currency',
 latitude=(input->>'latitude')::numeric,longitude=(input->>'longitude')::numeric,external_map_url=input->>'external_map_url' where id=p.id;
 return jsonb_build_object('ok',true);
end $$;

create or replace function private.deliver_due_plan_reminders(batch_size int default 100) returns int language plpgsql set search_path='' as $$
declare r record; processed int:=0;
begin
 for r in
  select reminder.id,reminder.plan_id,reminder.delivery_key,reminder.attempts,plan.couple_id
  from public.plan_reminders reminder join public.plans plan on plan.id=reminder.plan_id
  where reminder.state='pending' and reminder.due_at<=now() and (reminder.next_attempt_at is null or reminder.next_attempt_at<=now()) and plan.status='planned'
  order by reminder.due_at,reminder.id limit least(greatest(batch_size,1),500) for update of plan,reminder skip locked
 loop
  begin
   insert into public.notifications(recipient_id,couple_id,category,title,target_type,target_id,idempotency_key)
   select m.user_id,r.couple_id,'plan','A shared plan is coming up','plan',r.plan_id,'plan-reminder:'||r.delivery_key||':'||m.user_id
   from public.couple_memberships m join public.notification_preferences pref on pref.user_id=m.user_id and pref.in_app_enabled and pref.plans_enabled
   where m.couple_id=r.couple_id and m.left_at is null on conflict(idempotency_key) do nothing;
   update public.plan_reminders set state='delivered',delivered_at=now(),attempts=attempts+1,next_attempt_at=null,last_error_code=null where id=r.id;
  exception when others then
   update public.plan_reminders set attempts=attempts+1,state=case when attempts+1>=5 then 'failed' else 'pending' end,
   next_attempt_at=case when attempts+1>=5 then null else now()+make_interval(secs=>least(3600,60*power(2,attempts)::int)) end,
   last_error_code='delivery_failed' where id=r.id;
  end;
  processed:=processed+1;
 end loop;
 return processed;
end $$;
revoke all on function private.deliver_due_plan_reminders(int) from public,anon,authenticated,service_role;
