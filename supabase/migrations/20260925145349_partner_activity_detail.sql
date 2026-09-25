-- Partner activity says what happened: added, edited, completed or deleted, and how many
-- photos or videos arrived. Titles are still fixed copy chosen here; no user-entered title,
-- body, caption, file name or location is ever read into a notification.
--
-- Three behaviours are new:
--   * every top-level shared record also notifies when it is deleted (the envelope points
--     at the section, since the record is gone);
--   * photos and videos that finish within fifteen minutes of each other, on the same entry,
--     become one envelope whose count rises ("3 new photos added to a memory"), and the
--     phone's alert is re-sent in place instead of one alert per file;
--   * a run of edits to one record raises one "was edited" envelope until it is read or
--     thirty minutes pass, instead of one per save.

alter table public.notifications add column activity_count integer not null default 1
  check (activity_count between 1 and 10000);
comment on column public.notifications.activity_count is
  'How many partner changes this envelope stands for. Photo and video batches coalesce into one row instead of one alert per file.';

create or replace function private.partner_activity_title(noun text, happened text, media_kind text default null, amount integer default 1)
returns text language sql immutable set search_path = '' as $$
  select case happened
    when 'added' then 'New ' || noun || ' added'
    when 'edited' then 'A ' || noun || ' was edited'
    when 'deleted' then 'A ' || noun || ' was deleted'
    when 'completed' then 'A ' || noun || ' was completed'
    when 'media' then case when coalesce(amount, 1) <= 1
      then 'New ' || media_kind || ' added to a ' || noun
      else amount::text || ' new ' || media_kind || 's added to a ' || noun end
  end
$$;
revoke all on function private.partner_activity_title(text, text, text, integer) from public, anon, authenticated;

create or replace function private.partner_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb;
  old_data jsonb;
  v_couple uuid;
  v_actor uuid;
  v_category text := tg_argv[0];
  v_target_type text := tg_argv[1];
  v_title text := tg_argv[2];
  v_target_id uuid;
  v_noun text;
  v_happened text;
  v_media_kind text;
  v_key text;
begin
  if tg_op = 'DELETE' then row_data := to_jsonb(old); else row_data := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then old_data := to_jsonb(old); end if;

  -- Rows that only count once they are finished, and updates that changed nothing a person sees.
  if tg_table_name = 'drawing_notes' then
    if tg_op <> 'UPDATE' or row_data->>'status' <> 'ready' or old_data->>'status' = 'ready' then return null; end if;
  elsif tg_table_name = 'plan_attachments' then
    if tg_op <> 'UPDATE' or row_data->>'ready' <> 'true' or old_data->>'ready' = 'true' then return null; end if;
  elsif tg_table_name in ('memory_media', 'milestone_media') then
    if tg_op <> 'UPDATE' or row_data->>'state' <> 'ready' or old_data->>'state' = 'ready' then return null; end if;
  elsif tg_op = 'UPDATE' and (row_data - 'updated_at' - 'completed_by' - 'completed_at') =
    (old_data - 'updated_at' - 'completed_by' - 'completed_at') then return null;
  end if;

  v_happened := case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'edited' else 'deleted' end;
  v_target_id := (row_data->>'id')::uuid;

  if tg_table_name in ('plan_checklist_items', 'plan_reminders', 'plan_attachments') then
    v_target_id := (row_data->>'plan_id')::uuid;
    select couple_id into v_couple from public.plans where id = v_target_id;
    v_title := case tg_table_name
      when 'plan_reminders' then 'A reminder was added to a plan'
      when 'plan_attachments' then 'A file was attached to a plan'
      else case tg_op when 'INSERT' then 'A checklist item was added to a plan' else 'A plan checklist was updated' end
    end;
  elsif tg_table_name = 'bucket_item_subtasks' then
    v_target_id := (row_data->>'item_id')::uuid;
    select couple_id into v_couple from public.bucket_list_items where id = v_target_id;
    v_title := case tg_op when 'INSERT' then 'A step was added to a bucket idea' else 'A bucket idea step was updated' end;
  elsif tg_table_name in ('memory_media', 'milestone_media') then
    v_happened := 'media';
    v_media_kind := case when row_data->>'mime_type' like 'video/%' then 'video' else 'photo' end;
    if tg_table_name = 'memory_media' then
      v_target_id := (row_data->>'memory_id')::uuid; v_noun := 'memory';
      select couple_id into v_couple from public.memories where id = v_target_id;
    else
      v_target_id := (row_data->>'milestone_id')::uuid; v_noun := 'moment';
      select couple_id into v_couple from public.milestones where id = v_target_id;
    end if;
  elsif tg_table_name = 'notes' then
    -- Private notes never notify; a note that stops being shared is withdrawn elsewhere.
    if coalesce(row_data->>'type', '') <> 'shared' or (tg_op = 'UPDATE' and old_data->>'type' <> 'shared') then return null; end if;
    v_couple := (row_data->>'couple_id')::uuid; v_noun := 'shared note';
  elsif tg_table_name = 'entry_comments' then
    v_target_id := coalesce((row_data->>'memory_id')::uuid, (row_data->>'milestone_id')::uuid);
    if row_data->>'memory_id' is not null then
      select couple_id into v_couple from public.memories where id = v_target_id;
      v_title := 'New comment on a memory';
    else
      v_category := 'milestone'; v_target_type := 'milestone';
      select couple_id into v_couple from public.milestones where id = v_target_id;
      v_title := 'New comment on a moment';
    end if;
  elsif tg_table_name = 'media_comments' then
    if row_data->>'memory_media_id' is not null then
      select memory.id, memory.couple_id, media.mime_type into v_target_id, v_couple, v_media_kind
      from public.memory_media media join public.memories memory on memory.id = media.memory_id
      where media.id = (row_data->>'memory_media_id')::uuid;
      v_title := 'New comment on a ' || case when v_media_kind like 'video/%' then 'video' else 'photo' end || ' in a memory';
    else
      v_category := 'milestone'; v_target_type := 'milestone';
      select moment.id, moment.couple_id, media.mime_type into v_target_id, v_couple, v_media_kind
      from public.milestone_media media join public.milestones moment on moment.id = media.milestone_id
      where media.id = (row_data->>'milestone_media_id')::uuid;
      v_title := 'New comment on a ' || case when v_media_kind like 'video/%' then 'video' else 'photo' end || ' in a moment';
    end if;
    v_media_kind := null;
  elsif tg_table_name = 'drawing_notes' then
    v_couple := (row_data->>'couple_id')::uuid;
  else
    v_couple := (row_data->>'couple_id')::uuid;
    v_noun := case tg_table_name
      when 'memories' then 'memory' when 'milestones' then 'moment' when 'plans' then 'plan'
      when 'bucket_lists' then 'bucket list' when 'bucket_list_items' then 'bucket idea' when 'wishlist_items' then 'wish'
    end;
  end if;

  if tg_op = 'UPDATE' and tg_table_name in ('plans', 'bucket_list_items')
     and row_data->>'status' = 'completed' and old_data->>'status' <> 'completed' then
    v_happened := 'completed';
  end if;
  if v_noun is not null then v_title := private.partner_activity_title(v_noun, v_happened, v_media_kind, 1); end if;

  -- A deletion is credited to whoever deleted it; a cascade or a service job names nobody.
  if tg_op = 'DELETE' then
    v_actor := auth.uid();
  elsif tg_table_name in ('memory_media', 'milestone_media', 'entry_comments', 'media_comments', 'drawing_notes', 'notes', 'plan_attachments') then
    v_actor := (row_data->>coalesce(tg_argv[3], 'created_by'))::uuid;
  else
    v_actor := coalesce(auth.uid(), (row_data->>coalesce(tg_argv[3], 'created_by'))::uuid);
  end if;

  if tg_op = 'DELETE' then
    -- The record is gone, so the envelope points at its section, and a couple that is
    -- itself being deleted must not receive (or reference) anything.
    v_target_type := null; v_target_id := null;
    if not exists (select 1 from public.couples where id = v_couple) then return null; end if;
  end if;
  if v_couple is null or v_actor is null or (tg_op <> 'DELETE' and v_target_id is null) then return null; end if;

  v_key := case when v_happened = 'media'
    then 'media:' || v_media_kind || ':' || tg_table_name || ':' || (row_data->>'id')
    else 'activity:' || tg_table_name || ':' || (row_data->>'id') || ':' ||
      case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else gen_random_uuid()::text end
  end;

  with audience as (
    select member.user_id
    from public.couple_memberships member
    left join public.notification_preferences preference on preference.user_id = member.user_id
    where member.couple_id = v_couple and member.left_at is null and member.user_id <> v_actor
      and coalesce(preference.in_app_enabled, true)
      and case v_category
        when 'plan' then coalesce(preference.plans_enabled, true)
        when 'memory' then coalesce(preference.memories_enabled, true)
        when 'milestone' then coalesce(preference.milestones_enabled, true)
        when 'bucket' then coalesce(preference.bucket_enabled, true)
        when 'wishlist' then coalesce(preference.wishlist_enabled, true)
        when 'drawing' then coalesce(preference.drawings_enabled, true)
        when 'note' then coalesce(preference.notes_enabled, true)
        else false end
  ), recent as (
    -- The partner's still-unread envelope for the same batch of files, or the same run of edits.
    select distinct on (existing.recipient_id) existing.id, existing.recipient_id
    from public.notifications existing
    join audience on audience.user_id = existing.recipient_id
    where v_happened in ('media', 'edited')
      and existing.target_type = v_target_type and existing.target_id = v_target_id
      and existing.read_at is null
      and existing.created_at > now() - case when v_happened = 'media' then interval '15 minutes' else interval '30 minutes' end
      and case when v_happened = 'media'
        then existing.idempotency_key like 'media:' || v_media_kind || ':%'
        else existing.idempotency_key like 'activity:%' and existing.title = v_title end
    order by existing.recipient_id, existing.created_at desc
  ), bumped as (
    update public.notifications existing
    set activity_count = existing.activity_count + 1,
        title = private.partner_activity_title(v_noun, 'media', v_media_kind, existing.activity_count + 1),
        created_at = now()
    from recent
    where existing.id = recent.id and v_happened = 'media'
    returning existing.id
  ), resent_android as (
    -- The alert is tagged by notification id, so a re-send replaces it on the phone.
    update public.fcm_deliveries delivery
    set state = 'pending', attempts = 0, next_attempt_at = now(), last_error_code = null, delivered_at = null
    from bumped where delivery.notification_id = bumped.id
    returning delivery.id
  ), resent_web as (
    update public.push_deliveries delivery
    set state = 'pending', attempts = 0, next_attempt_at = now(), last_error_code = null, delivered_at = null
    from bumped where delivery.notification_id = bumped.id
    returning delivery.id
  )
  insert into public.notifications (recipient_id, couple_id, category, title, target_type, target_id, idempotency_key)
  select audience.user_id, v_couple, v_category, v_title, v_target_type, v_target_id, v_key || ':' || audience.user_id::text
  from audience
  where not exists (select 1 from recent where recent.recipient_id = audience.user_id)
  on conflict (idempotency_key) do nothing;

  return null;
end $$;
revoke all on function private.partner_activity() from public, anon, authenticated;

-- Deletions of shared records now tell the partner too.
create trigger memories_deleted_activity after delete on public.memories
  for each row execute function private.partner_activity('memory', 'memory', 'A memory was deleted');
create trigger moments_deleted_activity after delete on public.milestones
  for each row execute function private.partner_activity('milestone', 'milestone', 'A moment was deleted');
create trigger plans_deleted_activity after delete on public.plans
  for each row execute function private.partner_activity('plan', 'plan', 'A plan was deleted');
create trigger bucket_lists_deleted_activity after delete on public.bucket_lists
  for each row execute function private.partner_activity('bucket', 'bucket_list', 'A bucket list was deleted');
create trigger bucket_items_deleted_activity after delete on public.bucket_list_items
  for each row execute function private.partner_activity('bucket', 'bucket', 'A bucket idea was deleted');
create trigger wishlist_deleted_activity after delete on public.wishlist_items
  for each row execute function private.partner_activity('wishlist', 'wishlist', 'A wish was deleted', 'owner_id');
create trigger shared_note_deleted_activity after delete on public.notes
  for each row execute function private.partner_activity('note', 'note', 'A shared note was deleted', 'author_id');

-- Moments and notes were the two shared targets whose envelopes outlived them.
create trigger moment_activity_remove after delete on public.milestones
  for each row execute function private.remove_partner_activity('milestone');
create trigger note_activity_remove after delete on public.notes
  for each row execute function private.remove_partner_activity('note');

notify pgrst, 'reload schema';
