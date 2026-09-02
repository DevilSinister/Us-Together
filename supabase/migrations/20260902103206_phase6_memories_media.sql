-- Phase 6: memory editing, normalized tags, and verified private media.
alter table public.memories add column version integer not null default 1 check(version>0);
create function private.bump_memory_version() returns trigger language plpgsql set search_path='' as $$
begin new.version:=old.version+1; return new; end $$;
revoke all on function private.bump_memory_version() from public,anon,authenticated;
create trigger memories_version before update on public.memories for each row execute function private.bump_memory_version();

create function public.update_memory_details(input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.memories; tag_name text; tag_uuid uuid;
begin
 select * into m from public.memories where id=(input->>'id')::uuid for update;
 if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
 if m.version is distinct from (input->>'version')::integer then return jsonb_build_object('ok',false,'code','CONFLICT'); end if;
 if jsonb_typeof(input->'tags') is distinct from 'array' or jsonb_array_length(input->'tags')>8 then raise check_violation using message='Choose up to eight tags.'; end if;
 update public.memories set title=btrim(input->>'title'),description=nullif(input->>'description',''),memory_date=(input->>'memoryDate')::date,location=nullif(input->>'location',''),rating=(input->>'rating')::smallint,is_favorite=(input->>'favorite')::boolean where id=m.id;
 delete from public.memory_tag_links where memory_id=m.id;
 for tag_name in select distinct lower(btrim(value)) from jsonb_array_elements_text(input->'tags') loop
  if char_length(tag_name) not between 1 and 48 then raise check_violation using message='Invalid tag.'; end if;
  insert into public.memory_tags(couple_id,name) values(m.couple_id,tag_name) on conflict(couple_id,name) do update set name=excluded.name returning id into tag_uuid;
  insert into public.memory_tag_links(memory_id,tag_id) values(m.id,tag_uuid);
 end loop;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.update_memory_details(jsonb) from public,anon;
grant execute on function public.update_memory_details(jsonb) to authenticated;

alter table public.memory_media drop constraint memory_media_memory_id_fkey;
alter table public.memory_media add constraint memory_media_memory_id_fkey foreign key(memory_id) references public.memories(id) on delete restrict;
alter table public.memory_media add column state text not null default 'pending' check(state in ('pending','processing','ready','failed','deleting'));
alter table public.memory_media add column upload_expires_at timestamptz not null default now()+interval '1 hour';
alter table public.memory_media add column processing_at timestamptz;
alter table public.memory_media add column processing_token uuid;
alter table public.memory_media add column error_code text check(error_code is null or error_code in ('invalid_media','processing_failed'));
alter table public.memory_media add column caption text not null default '' check(char_length(caption)<=240);
-- No existing binary rows at rollout. The release supports decoded JPEG/PNG and bounded MP4/WebM.
alter table public.memory_media add constraint memory_media_release_limit check(size_bytes<=20971520);
revoke insert,update,delete on public.memory_media from authenticated;
grant all on public.memory_media to service_role;

create or replace function private.validate_memory_media_path() returns trigger language plpgsql set search_path='' as $$
declare tenant uuid;
begin
 select couple_id into tenant from public.memories where id=new.memory_id for update;
 if tenant is null or new.storage_path is distinct from tenant::text||'/'||new.memory_id::text||'/'||new.id::text||'/original'
 or (new.derivative_path is not null and new.derivative_path is distinct from tenant::text||'/'||new.memory_id::text||'/'||new.id::text||'/preview.jpg') then
  raise check_violation using message='Invalid media path.';
 end if;
 if tg_op='INSERT' and ((select count(*) from public.memory_media where memory_id=new.memory_id)>=30 or (select coalesce(sum(size_bytes),0) from public.memory_media where memory_id=new.memory_id)+new.size_bytes>314572800) then raise check_violation using message='Memory media limit reached.'; end if;
 if tg_op='UPDATE' and (new.memory_id is distinct from old.memory_id or new.created_by is distinct from old.created_by or new.storage_path is distinct from old.storage_path or new.size_bytes is distinct from old.size_bytes or new.mime_type is distinct from old.mime_type) then raise insufficient_privilege using message='Media identity is immutable.'; end if;
 return new;
end $$;

create function private.guard_memory_media_delete() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from storage.objects where bucket_id='memory-media' and name in (old.storage_path,old.derivative_path)) then raise check_violation using message='Remove stored objects first.'; end if;
 return old;
end $$;
revoke all on function private.guard_memory_media_delete() from public,anon,authenticated;
create trigger memory_media_remove_objects before delete on public.memory_media for each row execute function private.guard_memory_media_delete();

-- Exact metadata lookup replaces prefix-only access. Definers are private and identity-bound.
create or replace function private.can_access_memory_object(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists (
 select 1 from public.memory_media mm join public.memories m on m.id=mm.memory_id
 where (mm.storage_path=object_name or mm.derivative_path=object_name)
 and private.is_active_couple_member(m.couple_id)
 and (mm.state='ready' or (mm.created_by=(select auth.uid()) and mm.state in ('pending','processing','failed'))));
$$;
create function private.can_upload_memory_object(object_name text) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare mm public.memory_media;
begin
 if auth.uid() is null then return false; end if;
 select * into mm from public.memory_media where storage_path=object_name for share;
 return found and mm.created_by=auth.uid() and mm.state='pending' and mm.upload_expires_at>now() and private.is_active_couple_member(private.memory_couple(mm.memory_id));
end $$;
revoke all on function private.can_upload_memory_object(text) from public,anon,authenticated;
grant execute on function private.can_upload_memory_object(text) to authenticated;
drop policy memory_objects_insert_member on storage.objects;
drop policy memory_objects_update_member on storage.objects;
drop policy memory_objects_delete_member on storage.objects;
create policy memory_objects_insert_authorized on storage.objects for insert to authenticated with check(bucket_id='memory-media' and private.can_upload_memory_object(name));
-- Finalization/deletion use the authenticated Edge service boundary; no browser overwrite/delete.
update storage.buckets set public=false,file_size_limit=20971520,allowed_mime_types=array['image/jpeg','image/png','video/mp4','video/webm'] where id='memory-media';
create index memory_media_pending_idx on public.memory_media(upload_expires_at,id) where state<>'ready';
