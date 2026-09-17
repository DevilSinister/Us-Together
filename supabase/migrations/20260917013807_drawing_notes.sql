-- Finished drawings are immutable. Pending rows grant one upload.
create table public.drawing_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint drawing_notes_path check (object_path = author_id::text || '/' || id::text || '.png'),
  constraint drawing_notes_sent check ((status = 'pending' and sent_at is null) or (status = 'ready' and sent_at is not null)),
  constraint drawing_notes_not_self check (author_id <> recipient_id)
);
create index drawing_notes_recipient_latest_idx on public.drawing_notes(recipient_id, sent_at desc, id desc) where status = 'ready';
create index drawing_notes_couple_history_idx on public.drawing_notes(couple_id, sent_at desc, id desc) where status = 'ready';

create function private.guard_drawing_note() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.status <> 'pending' or new.id is distinct from old.id or new.couple_id is distinct from old.couple_id
      or new.author_id is distinct from old.author_id or new.recipient_id is distinct from old.recipient_id
      or new.object_path is distinct from old.object_path or new.created_at is distinct from old.created_at
      or new.status <> 'ready' then
      raise exception using errcode = '42501', message = 'A sent drawing cannot be changed.';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'drawing-notes' and o.name = old.object_path) then
      raise exception using errcode = '23514', message = 'Drawing image must be uploaded before send.';
    end if;
    new.sent_at := now();
  end if;
  return new;
end $$;
revoke all on function private.guard_drawing_note() from public, anon, authenticated;
create trigger drawing_notes_guard before update on public.drawing_notes for each row execute function private.guard_drawing_note();

alter table public.drawing_notes enable row level security;
alter table public.drawing_notes force row level security;
revoke all on public.drawing_notes from anon, authenticated;
grant select, insert, update, delete on public.drawing_notes to authenticated;
create policy drawing_notes_select on public.drawing_notes for select to authenticated
  using (private.is_active_couple_member(couple_id) and
    (author_id = (select auth.uid()) or (status = 'ready' and recipient_id = (select auth.uid()))));
create policy drawing_notes_insert on public.drawing_notes for insert to authenticated
  with check (status = 'pending' and sent_at is null and author_id = (select auth.uid())
    and private.is_active_couple_member(couple_id)
    and exists (select 1 from public.couple_memberships m where m.couple_id = drawing_notes.couple_id
      and m.user_id = drawing_notes.recipient_id and m.left_at is null));
create policy drawing_notes_finish on public.drawing_notes for update to authenticated
  using (status = 'pending' and author_id = (select auth.uid()) and private.is_active_couple_member(couple_id))
  with check (status = 'ready' and author_id = (select auth.uid()) and private.is_active_couple_member(couple_id));
create policy drawing_notes_abandon on public.drawing_notes for delete to authenticated
  using (status = 'pending' and author_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('drawing-notes','drawing-notes',false,2097152,array['image/png'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
create policy drawing_objects_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'drawing-notes' and exists (select 1 from public.drawing_notes n
    where n.object_path = name and n.status = 'pending' and n.author_id = (select auth.uid())));
create policy drawing_objects_read on storage.objects for select to authenticated using (
  bucket_id = 'drawing-notes' and exists (select 1 from public.drawing_notes n
    where n.object_path = name and (n.author_id = (select auth.uid()) or
      (n.status = 'ready' and n.recipient_id = (select auth.uid())))));
create policy drawing_objects_abandon on storage.objects for delete to authenticated using (
  bucket_id = 'drawing-notes' and exists (select 1 from public.drawing_notes n
    where n.object_path = name and n.status = 'pending' and n.author_id = (select auth.uid())));


-- Device tokens are private to their owner. The server reads them only after an
-- authenticated send has committed and never places drawing content in FCM.
create table public.drawing_devices (
  token text primary key check (char_length(token) between 20 and 512),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index drawing_devices_user_idx on public.drawing_devices(user_id);
alter table public.drawing_devices enable row level security;
alter table public.drawing_devices force row level security;
revoke all on public.drawing_devices from anon, authenticated;
grant select, insert, update, delete on public.drawing_devices to authenticated;
create policy drawing_devices_select on public.drawing_devices for select to authenticated using (user_id = (select auth.uid()));
create policy drawing_devices_insert on public.drawing_devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy drawing_devices_update on public.drawing_devices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy drawing_devices_delete on public.drawing_devices for delete to authenticated using (user_id = (select auth.uid()));
