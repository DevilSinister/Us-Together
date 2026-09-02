-- Phase 5 plan lifecycle, calendar support, reminders, and private attachments.
alter table public.plan_checklist_items drop constraint plan_checklist_items_plan_id_position_key;
alter table public.plan_checklist_items add constraint plan_checklist_position unique(plan_id,position) deferrable initially deferred;
alter table public.plans add column version integer not null default 1 check (version > 0);
alter table public.plan_reminders add column offset_minutes integer not null default 0 check (offset_minutes between 0 and 43200);
alter table public.plan_reminders add constraint reminder_due_before_plan unique (plan_id, offset_minutes);
alter table public.plan_reminders add constraint reminder_delivery_complete check ((state = 'delivered') = (delivered_at is not null));

create table public.plan_attachments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete restrict,
  uploaded_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  filename text not null check (char_length(btrim(filename)) between 1 and 160),
  mime_type text not null check (mime_type in ('application/pdf','image/png','image/jpeg')),
  size_bytes integer not null check (size_bytes between 1 and 2097152),
  object_path text not null unique,
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  constraint plan_attachment_path_shape check (object_path = plan_id::text || '/' || id::text)
);
create index plan_attachments_plan_idx on public.plan_attachments (plan_id, created_at, id);
alter table public.plan_attachments enable row level security;
alter table public.plan_attachments force row level security;
revoke all on table public.plan_attachments from public, anon, authenticated;
grant select, insert, update, delete on table public.plan_attachments to authenticated;
create policy "plan_attachments_select_member" on public.plan_attachments for select to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_attachments_insert_member" on public.plan_attachments for insert to authenticated with check (uploaded_by = (select auth.uid()) and private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_attachments_update_member" on public.plan_attachments for update to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id))) with check (private.is_active_couple_member(private.plan_couple(plan_id)));
create policy "plan_attachments_delete_member" on public.plan_attachments for delete to authenticated using (private.is_active_couple_member(private.plan_couple(plan_id)));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('plan-attachments','plan-attachments',false,2097152,array['application/pdf','image/png','image/jpeg']) on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

create function private.can_access_plan_object(path text)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and exists (
   select 1 from public.plan_attachments a join public.plans p on p.id=a.plan_id
   where a.object_path=path and private.is_active_couple_member(p.couple_id)
 )
$$;
revoke all on function private.can_access_plan_object(text) from public, anon, authenticated;
grant execute on function private.can_access_plan_object(text) to authenticated;
create policy "plan_attachment_objects_select" on storage.objects for select to authenticated using (bucket_id='plan-attachments' and private.can_access_plan_object(name));
create policy "plan_attachment_objects_insert" on storage.objects for insert to authenticated with check (bucket_id='plan-attachments' and exists (select 1 from public.plan_attachments a where a.object_path=name and a.uploaded_by=(select auth.uid()) and private.is_active_couple_member(private.plan_couple(a.plan_id))));
create policy "plan_attachment_objects_delete" on storage.objects for delete to authenticated using (bucket_id='plan-attachments' and exists (select 1 from public.plan_attachments a where a.object_path=name and private.is_active_couple_member(private.plan_couple(a.plan_id))));

create function private.guard_phase5_rows() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='plan_reminders' then
   if tg_op='INSERT' and (new.state<>'pending' or new.attempts<>0 or new.delivered_at is not null) then raise exception using errcode='42501',message='Reminder delivery state is server-managed.'; end if;
   if tg_op='UPDATE' and new.plan_id<>old.plan_id then raise exception using errcode='42501',message='Reminder parent is immutable.'; end if;
   if tg_op='UPDATE' and current_user in ('authenticated','anon') and (new.created_by<>old.created_by or new.delivery_key<>old.delivery_key or new.attempts<>old.attempts or new.delivered_at is distinct from old.delivered_at or new.state not in ('pending','cancelled')) then raise exception using errcode='42501',message='Reminder delivery state is server-managed.'; end if;
   if current_user in ('authenticated','anon') and new.state='pending' and not exists(select 1 from public.plans p where p.id=new.plan_id and p.status='planned' and new.due_at=p.starts_at-make_interval(mins=>new.offset_minutes) and new.due_at>now()) then raise exception using errcode='23514',message='Reminder must be a future instant relative to the plan.'; end if;
 elsif tg_table_name='plan_attachments' then
   if tg_op='UPDATE' and (new.plan_id<>old.plan_id or new.uploaded_by<>old.uploaded_by or new.object_path<>old.object_path or new.filename<>old.filename or new.mime_type<>old.mime_type or new.size_bytes<>old.size_bytes or old.ready) then raise exception using errcode='42501',message='Attachment metadata is immutable.'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_phase5_rows() from public,anon,authenticated;
create trigger plan_reminders_guard before insert or update on public.plan_reminders for each row execute function private.guard_phase5_rows();
create trigger plan_attachments_guard before update on public.plan_attachments for each row execute function private.guard_phase5_rows();

create function private.bump_plan_for_child() returns trigger language plpgsql set search_path='' as $$
declare target uuid := coalesce(new.plan_id,old.plan_id);
begin update public.plans set version=version+1 where id=target; return coalesce(new,old); end $$;
revoke all on function private.bump_plan_for_child() from public,anon,authenticated;
create trigger plan_checklist_bump after insert or update or delete on public.plan_checklist_items for each row execute function private.bump_plan_for_child();
create trigger plan_reminder_bump after insert or update or delete on public.plan_reminders for each row execute function private.bump_plan_for_child();

create function private.bump_plan_version() returns trigger language plpgsql set search_path='' as $$
begin new.version=old.version+1;
 if current_user in ('authenticated','anon') then
   if new.status='completed' and old.status<>'completed' then new.completed_by=auth.uid();new.completed_at=now();
   elsif new.status='completed' then new.completed_by=old.completed_by;new.completed_at=old.completed_at;
   else new.completed_by=null;new.completed_at=null; end if;
 end if;
 return new; end $$;
revoke all on function private.bump_plan_version() from public,anon,authenticated;
create trigger plans_bump_version before update on public.plans for each row execute function private.bump_plan_version();

create function public.mutate_plan(input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.plans; op text:=input->>'operation'; kind text:=input->>'kind'; expected int:=(input->>'version')::int; ids uuid[]; v_label text; mins int;
begin
 select * into p from public.plans where id=(input->>'planId')::uuid for update;
 if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
 if p.version is distinct from expected then return jsonb_build_object('ok',false,'code','CONFLICT'); end if;
 if op is null or op not in ('status','delete','checklist','reminder') then raise exception using errcode='22023',message='Unknown operation.'; end if;
 if op='status' then
   update public.plans set status=input->>'status',completed_by=case when input->>'status'='completed' then (select auth.uid()) end,completed_at=case when input->>'status'='completed' then now() end where id=p.id;
   if input->>'status'<>'planned' then update public.plan_reminders set state='cancelled' where plan_id=p.id and state='pending'; end if;
 elsif op='delete' then
   if exists(select 1 from public.plan_attachments where plan_id=p.id) then return jsonb_build_object('ok',false,'code','ATTACHMENTS_EXIST'); end if;
   delete from public.plans where id=p.id; return jsonb_build_object('ok',true,'deleted',true);
 elsif op='checklist' then
   if kind is null or kind not in ('add','update','delete','reorder') then raise exception using errcode='22023',message='Unknown checklist operation.'; end if;
   if kind='add' then if (select count(*) from public.plan_checklist_items where plan_id=p.id)>=50 then raise exception using errcode='23514',message='Checklist is full.'; end if; select btrim(input->>'label') into v_label; insert into public.plan_checklist_items(plan_id,label,position) select p.id,v_label,coalesce(max(position)+1,0) from public.plan_checklist_items where plan_id=p.id;
   elsif kind='update' then update public.plan_checklist_items set label=coalesce(nullif(btrim(input->>'label'),''),label),is_completed=coalesce((input->>'completed')::boolean,is_completed) where id=(input->>'id')::uuid and plan_id=p.id;
   elsif kind='delete' then delete from public.plan_checklist_items where id=(input->>'id')::uuid and plan_id=p.id;
   elsif kind='reorder' then
     select array_agg(value::uuid order by ordinality) into ids from jsonb_array_elements_text(input->'ids') with ordinality;
     if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) or cardinality(ids)<>(select count(*) from public.plan_checklist_items where plan_id=p.id) or exists(select 1 from unnest(ids) i where not exists(select 1 from public.plan_checklist_items c where c.plan_id=p.id and c.id=i)) then return jsonb_build_object('ok',false,'code','INVALID_ORDER'); end if;
     update public.plan_checklist_items c set position=u.ord-1 from unnest(ids) with ordinality u(id,ord) where c.id=u.id;
   end if;
 elsif op='reminder' then
   if kind is null or kind not in ('add','delete') then raise exception using errcode='22023',message='Unknown reminder operation.'; end if;
   if kind='add' then if (select count(*) from public.plan_reminders where plan_id=p.id)>=5 then raise exception using errcode='23514',message='Five reminders per plan.'; end if; mins:=(input->>'minutes')::int; insert into public.plan_reminders(plan_id,due_at,offset_minutes) values(p.id,p.starts_at-make_interval(mins=>mins),mins);
   else delete from public.plan_reminders where id=(input->>'id')::uuid and plan_id=p.id and state in ('pending','cancelled'); end if;
 end if;
 select version into expected from public.plans where id=p.id;
 return jsonb_build_object('ok',true,'version',expected);
end $$;
revoke all on function public.mutate_plan(jsonb) from public,anon;
grant execute on function public.mutate_plan(jsonb) to authenticated;

create function private.deliver_due_plan_reminders(batch_size int default 100) returns int language plpgsql set search_path='' as $$
declare delivered int;
begin
 with claimed as (
  select r.id,r.plan_id,r.delivery_key,p.couple_id from public.plan_reminders r join public.plans p on p.id=r.plan_id
  where r.state='pending' and r.due_at<=now() and p.status='planned' order by r.due_at,r.id limit least(greatest(batch_size,1),500) for update of p,r skip locked
 ), inserted as (
  insert into public.notifications(recipient_id,couple_id,category,title,target_type,target_id,idempotency_key)
  select m.user_id,c.couple_id,'plan','A shared plan is coming up','plan',c.plan_id,'plan-reminder:'||c.delivery_key||':'||m.user_id
  from claimed c join public.couple_memberships m on m.couple_id=c.couple_id and m.left_at is null join public.notification_preferences pref on pref.user_id=m.user_id and pref.in_app_enabled and pref.plans_enabled
  on conflict(idempotency_key) do nothing
 )
 update public.plan_reminders r set state='delivered',delivered_at=now(),attempts=attempts+1 from claimed c where r.id=c.id;
 get diagnostics delivered=row_count; return delivered;
end $$;
revoke all on function private.deliver_due_plan_reminders(int) from public,anon,authenticated,service_role;
comment on function private.deliver_due_plan_reminders(int) is 'Invoked by a trusted database scheduler; content-minimal and idempotent per recipient.';

create function public.update_plan_details(input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.plans; new_start timestamptz:=(input->>'starts_at')::timestamptz;
begin
 select * into p from public.plans where id=(input->>'planId')::uuid for update;
 if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
 if p.version is distinct from (input->>'version')::int then return jsonb_build_object('ok',false,'code','CONFLICT'); end if;
 if not exists(select 1 from pg_timezone_names where name=input->>'timezone') then raise exception using errcode='22023',message='Invalid timezone.'; end if;
 update public.plans set title=input->>'title',description=input->>'description',type=input->>'type',starts_at=new_start,ends_at=(input->>'ends_at')::timestamptz,originating_timezone=input->>'timezone',location=input->>'location',budget_minor=(input->>'budget_minor')::bigint,currency=input->>'currency' where id=p.id;
 update public.plan_reminders set due_at=new_start-make_interval(mins=>offset_minutes),state=case when new_start-make_interval(mins=>offset_minutes)>now() and p.status='planned' then 'pending' else 'cancelled' end where plan_id=p.id and state='pending';
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.update_plan_details(jsonb) from public,anon;
grant execute on function public.update_plan_details(jsonb) to authenticated;

-- Child identities cannot be moved between plans, including within one couple.
create function private.guard_plan_checklist_parent() returns trigger language plpgsql set search_path='' as $$
begin if new.plan_id<>old.plan_id then raise exception using errcode='42501',message='Checklist parent is immutable.'; end if; return new; end $$;
revoke all on function private.guard_plan_checklist_parent() from public,anon,authenticated;
create trigger plan_checklist_parent before update on public.plan_checklist_items for each row execute function private.guard_plan_checklist_parent();

create function private.sync_plan_reminders() returns trigger language plpgsql set search_path='' as $$
begin
 if new.starts_at is distinct from old.starts_at or new.status is distinct from old.status then
   update public.plan_reminders set due_at=new.starts_at-make_interval(mins=>offset_minutes),state=case when new.status='planned' and new.starts_at-make_interval(mins=>offset_minutes)>now() then 'pending' else 'cancelled' end where plan_id=new.id and state='pending';
 end if; return new;
end $$;
revoke all on function private.sync_plan_reminders() from public,anon,authenticated;
create trigger plans_sync_reminders after update on public.plans for each row execute function private.sync_plan_reminders();
create extension if not exists pg_cron;
select cron.schedule('us-together-plan-reminders','* * * * *','select private.deliver_due_plan_reminders(100)');
