-- Verified separate plan job: us-together-plan-reminders invokes private.deliver_due_plan_reminders(100).
-- This migration touches only memory/milestone entry reminders, never public.plan_reminders.
-- Entry reminders are retired; retain historical records without further delivery.
select cron.unschedule(jobid) from cron.job where jobname='us-together-entry-reminders';
revoke all on public.entry_reminders from authenticated,anon;
revoke execute on function public.set_entry_reminder(uuid,uuid,timestamptz) from public,anon,authenticated;
create or replace function private.deliver_entry_reminders(batch_size integer default 100) returns integer language plpgsql set search_path='' as $$ begin return 0; end $$;
revoke all on function private.deliver_entry_reminders(integer) from public,anon,authenticated;

create table public.media_comments (
 id uuid primary key default gen_random_uuid(),
 memory_media_id uuid references public.memory_media(id) on delete cascade,
 milestone_media_id uuid references public.milestone_media(id) on delete cascade,
 created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 check(num_nonnulls(memory_media_id,milestone_media_id)=1)
);
create index media_comments_memory_idx on public.media_comments(memory_media_id,created_at,id);
create index media_comments_moment_idx on public.media_comments(milestone_media_id,created_at,id);
create index media_comments_author_idx on public.media_comments(created_by);
alter table public.media_comments enable row level security;
revoke all on public.media_comments from public,anon,authenticated;
grant select,insert,delete on public.media_comments to authenticated;
create function public.can_access_media_comment(memory uuid,moment uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select (num_nonnulls(memory,moment)=1) and (
 exists(select 1 from public.memory_media where id=memory and state='ready') or
 exists(select 1 from public.milestone_media where id=moment and state='ready'))
$$;
revoke all on function public.can_access_media_comment(uuid,uuid) from public,anon;
grant execute on function public.can_access_media_comment(uuid,uuid) to authenticated;
create policy media_comments_select on public.media_comments for select to authenticated
 using(public.can_access_media_comment(memory_media_id,milestone_media_id));
create policy media_comments_insert on public.media_comments for insert to authenticated
 with check(created_by=(select auth.uid()) and public.can_access_media_comment(memory_media_id,milestone_media_id));
create policy media_comments_delete on public.media_comments for delete to authenticated
 using(created_by=(select auth.uid()) and public.can_access_media_comment(memory_media_id,milestone_media_id));
create function private.limit_media_comments() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('media-comments:'||coalesce(new.memory_media_id,new.milestone_media_id)::text,0));
 if (select count(*) from public.media_comments where memory_media_id=new.memory_media_id or milestone_media_id=new.milestone_media_id)>=500 then
 raise check_violation using message='Comment limit reached';end if;
 return new;
end $$;
revoke all on function private.limit_media_comments() from public,anon,authenticated;
create trigger media_comments_limit before insert on public.media_comments for each row execute function private.limit_media_comments();

create view public.shared_gallery with (security_invoker=true) as
 select 'memory'::text as kind,'memory:'||f.id::text as sort_key,f.id,m.id as entry_id,m.couple_id,m.title as entry_title,m.memory_date as entry_date,
 f.caption,f.media_type,f.mime_type,f.state,f.size_bytes,f.duration_seconds
 from public.memory_media f join public.memories m on m.id=f.memory_id where f.state='ready'
 union all
 select 'moment'::text,'moment:'||f.id::text,f.id,m.id,m.couple_id,m.title,m.milestone_date,
 f.caption,f.media_type,f.mime_type,f.state,f.size_bytes,f.duration_seconds
 from public.milestone_media f join public.milestones m on m.id=f.milestone_id where f.state='ready';
revoke all on public.shared_gallery from public,anon,authenticated;
grant select on public.shared_gallery to authenticated;
