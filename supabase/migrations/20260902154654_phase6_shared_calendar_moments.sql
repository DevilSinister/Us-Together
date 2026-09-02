-- Phase 6 extension: moment media, comments and personal in-app reminders.
alter table public.milestones add column location text check(location is null or char_length(location)<=240);
create table public.milestone_media (like public.memory_media including defaults including constraints including indexes);
alter table public.milestone_media rename column memory_id to milestone_id;
alter table public.milestone_media add foreign key(milestone_id) references public.milestones(id) on delete restrict;
alter table public.milestone_media add foreign key(created_by) references auth.users(id) on delete restrict;
alter table public.milestone_media enable row level security;
revoke all on public.milestone_media from public,anon,authenticated;
grant select on public.milestone_media to authenticated;
grant all on public.milestone_media to service_role;
create index milestone_media_parent_idx on public.milestone_media(milestone_id,created_at);
create index milestone_media_creator_idx on public.milestone_media(created_by);
create policy milestone_media_select on public.milestone_media for select to authenticated using(exists(select 1 from public.milestones m where m.id=milestone_id and private.is_active_couple_member(m.couple_id)));
create or replace function private.validate_milestone_media_path() returns trigger language plpgsql set search_path='' as $$
declare tenant uuid;
begin
 select couple_id into tenant from public.milestones where id=new.milestone_id for update;
 if tenant is null or new.storage_path is distinct from tenant::text||'/'||new.milestone_id::text||'/'||new.id::text||'/original'
 or (new.derivative_path is not null and new.derivative_path is distinct from tenant::text||'/'||new.milestone_id::text||'/'||new.id::text||'/preview.jpg') then
  raise check_violation using message='Invalid media path.';
 end if;
 if tg_op='INSERT' and ((select count(*) from public.milestone_media where milestone_id=new.milestone_id)>=30 or (select coalesce(sum(size_bytes),0) from public.milestone_media where milestone_id=new.milestone_id)+new.size_bytes>314572800) then raise check_violation using message='Memory media limit reached.'; end if;
 if tg_op='UPDATE' and (new.milestone_id is distinct from old.milestone_id or new.created_by is distinct from old.created_by or new.storage_path is distinct from old.storage_path or new.size_bytes is distinct from old.size_bytes or new.mime_type is distinct from old.mime_type) then raise insufficient_privilege using message='Media identity is immutable.'; end if;
 return new;
end $$;
revoke all on function private.validate_milestone_media_path() from public,anon,authenticated;
create trigger milestone_media_path before insert or update on public.milestone_media for each row execute function private.validate_milestone_media_path();
create function private.guard_milestone_media_delete() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from storage.objects where bucket_id='moment-media' and name in (old.storage_path,old.derivative_path)) then raise check_violation using message='Remove stored objects first.'; end if;
 return old;
end $$;
revoke all on function private.guard_milestone_media_delete() from public,anon,authenticated;
create trigger milestone_media_remove_objects before delete on public.milestone_media for each row execute function private.guard_milestone_media_delete();
create or replace function private.can_access_milestone_object(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists (
 select 1 from public.milestone_media mm join public.milestones m on m.id=mm.milestone_id
 where (mm.storage_path=object_name or mm.derivative_path=object_name)
 and private.is_active_couple_member(m.couple_id)
 and (mm.state='ready' or (mm.created_by=(select auth.uid()) and mm.state in ('pending','processing','failed'))));
$$;
create function private.can_upload_milestone_object(object_name text) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare mm public.milestone_media;
begin
 if auth.uid() is null then return false; end if;
 select * into mm from public.milestone_media where storage_path=object_name for share;
 return found and mm.created_by=auth.uid() and mm.state='pending' and mm.upload_expires_at>now() and private.is_active_couple_member((select couple_id from public.milestones where id=mm.milestone_id));
end $$;
revoke all on function private.can_upload_milestone_object(text) from public,anon,authenticated;
grant execute on function private.can_upload_milestone_object(text) to authenticated;
revoke all on function private.can_access_milestone_object(text) from public,anon,authenticated;
grant execute on function private.can_access_milestone_object(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('moment-media','moment-media',false,20971520,array['image/jpeg','image/png','video/mp4','video/webm']);
create policy moment_objects_select on storage.objects for select to authenticated using(bucket_id='moment-media' and private.can_access_milestone_object(name));
create policy moment_objects_insert on storage.objects for insert to authenticated with check(bucket_id='moment-media' and private.can_upload_milestone_object(name));

-- These helpers are invokers: current row visibility remains the authorization boundary.
create function public.can_access_entry(memory uuid,moment uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select (select auth.uid()) is not null and
 ((memory is not null and moment is null and exists(select 1 from public.memories m where m.id=memory and private.is_active_couple_member(m.couple_id)))
 or (moment is not null and memory is null and exists(select 1 from public.milestones m where m.id=moment and private.is_active_couple_member(m.couple_id))));
$$;
revoke all on function public.can_access_entry(uuid,uuid) from public,anon;
grant execute on function public.can_access_entry(uuid,uuid) to authenticated;

create table public.entry_comments(
 id uuid primary key default gen_random_uuid(),
 memory_id uuid references public.memories(id) on delete cascade,
 milestone_id uuid references public.milestones(id) on delete cascade,
 created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 check(num_nonnulls(memory_id,milestone_id)=1)
);
create index entry_comments_memory_idx on public.entry_comments(memory_id,created_at,id);
create index entry_comments_milestone_idx on public.entry_comments(milestone_id,created_at,id);
create index entry_comments_author_idx on public.entry_comments(created_by);
alter table public.entry_comments enable row level security;
revoke all on public.entry_comments from public,anon,authenticated;
grant select,insert,delete on public.entry_comments to authenticated;
create policy entry_comments_select on public.entry_comments for select to authenticated using(public.can_access_entry(memory_id,milestone_id));
create policy entry_comments_insert on public.entry_comments for insert to authenticated with check(created_by=(select auth.uid()) and public.can_access_entry(memory_id,milestone_id));
create policy entry_comments_delete on public.entry_comments for delete to authenticated using(created_by=(select auth.uid()) and public.can_access_entry(memory_id,milestone_id));
create function private.limit_entry_comments() returns trigger language plpgsql set search_path='' as $$
begin
 if new.memory_id is not null then perform 1 from public.memories where id=new.memory_id for update;
 else perform 1 from public.milestones where id=new.milestone_id for update;end if;
 if (select count(*) from public.entry_comments where memory_id=new.memory_id or milestone_id=new.milestone_id)>=500 then raise check_violation using message='Comment limit reached';end if;
 return new;
end $$;
revoke all on function private.limit_entry_comments() from public,anon,authenticated;
create trigger entry_comments_limit before insert on public.entry_comments for each row execute function private.limit_entry_comments();

create table public.entry_reminders(
 id uuid primary key default gen_random_uuid(),
 memory_id uuid references public.memories(id) on delete cascade,
 milestone_id uuid references public.milestones(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 due_at timestamptz not null,
 state text not null default 'pending' check(state in ('pending','delivered','cancelled','failed')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 next_attempt_at timestamptz not null default now(),
 check(num_nonnulls(memory_id,milestone_id)=1)
);
create unique index entry_reminders_memory_user_idx on public.entry_reminders(memory_id,user_id) where memory_id is not null;
create unique index entry_reminders_milestone_user_idx on public.entry_reminders(milestone_id,user_id) where milestone_id is not null;
create index entry_reminders_user_idx on public.entry_reminders(user_id);
create index entry_reminders_due_idx on public.entry_reminders(due_at,next_attempt_at) where state='pending';
alter table public.entry_reminders enable row level security;
revoke all on public.entry_reminders from public,anon,authenticated;
grant select,insert,delete on public.entry_reminders to authenticated;
create policy entry_reminders_select on public.entry_reminders for select to authenticated using(user_id=(select auth.uid()) and public.can_access_entry(memory_id,milestone_id));
create policy entry_reminders_insert on public.entry_reminders for insert to authenticated with check(user_id=(select auth.uid()) and public.can_access_entry(memory_id,milestone_id) and state='pending' and attempts=0 and due_at>now() and due_at<now()+interval '5 years' and next_attempt_at<=now());
create policy entry_reminders_delete on public.entry_reminders for delete to authenticated using(user_id=(select auth.uid()) and public.can_access_entry(memory_id,milestone_id));
create function public.set_entry_reminder(memory uuid,moment uuid,due timestamptz) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if not public.can_access_entry(memory,moment) then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||coalesce(memory,moment)::text,0));
 delete from public.entry_reminders where user_id=auth.uid() and (memory_id=memory or milestone_id=moment);
 if due is not null then
 insert into public.entry_reminders(memory_id,milestone_id,due_at) values(memory,moment,due) returning id into result;
 end if;
 return result;
end $$;
revoke all on function public.set_entry_reminder(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.set_entry_reminder(uuid,uuid,timestamptz) to authenticated;

create function private.deliver_entry_reminders(batch_size integer default 100) returns integer language plpgsql security invoker set search_path='' as $$
declare r record; tenant uuid; delivered integer:=0;
begin
 for r in select * from public.entry_reminders where state='pending' and due_at<=now() and next_attempt_at<=now() order by due_at,id limit least(greatest(batch_size,1),100) for update skip locked loop
  begin
   tenant:=null;
   if r.memory_id is not null then select couple_id into tenant from public.memories where id=r.memory_id;
   else select couple_id into tenant from public.milestones where id=r.milestone_id;end if;
   if not exists(select 1 from public.couple_memberships where couple_id=tenant and user_id=r.user_id and left_at is null) then
    update public.entry_reminders set state='cancelled' where id=r.id;continue;
   end if;
   insert into public.notifications(recipient_id,couple_id,category,title,target_type,target_id,idempotency_key)
   select r.user_id,tenant,case when r.memory_id is not null then 'memory' else 'milestone' end,
    case when r.memory_id is not null then 'A memory date is coming up' else 'A moment is coming up' end,
    case when r.memory_id is not null then 'memory' else 'milestone' end,coalesce(r.memory_id,r.milestone_id),'entry-reminder:'||r.id::text
   from public.notification_preferences p where p.user_id=r.user_id and p.in_app_enabled and
    case when r.memory_id is not null then p.memories_enabled else p.milestones_enabled end
   on conflict(idempotency_key) do nothing;
   update public.entry_reminders set state='delivered',attempts=attempts+1 where id=r.id;
   delivered:=delivered+1;
  exception when others then
   update public.entry_reminders set attempts=attempts+1,state=case when attempts+1>=5 then 'failed' else 'pending' end,next_attempt_at=now()+make_interval(mins=>power(2,attempts)::integer) where id=r.id;
  end;
 end loop;
 return delivered;
end $$;
revoke all on function private.deliver_entry_reminders(integer) from public,anon,authenticated,service_role;
select cron.schedule('us-together-entry-reminders','* * * * *','select private.deliver_entry_reminders(100)');
