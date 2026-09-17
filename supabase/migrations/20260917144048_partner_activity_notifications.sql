-- Shared partner activity emits fixed copy only after the row is visible.
alter table public.notifications drop constraint notifications_category_check;
alter table public.notifications add constraint notifications_category_check check
  (category in ('plan','memory','milestone','note','system','on_this_day','bucket','wishlist','drawing'));
alter table public.notifications drop constraint notifications_target_type_check;
alter table public.notifications add constraint notifications_target_type_check check
  (target_type is null or target_type in ('plan','memory','milestone','note','bucket','bucket_list','wishlist','drawing'));
alter table public.notification_preferences add column bucket_enabled boolean not null default true,
  add column wishlist_enabled boolean not null default true,
  add column drawings_enabled boolean not null default true;

create function private.partner_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare
  row_data jsonb := to_jsonb(new);
  old_data jsonb;
  partner_couple uuid;
  actor uuid := auth.uid();
  category text := tg_argv[0];
  target_type text := tg_argv[1];
  title text := tg_argv[2];
  target_id uuid;
begin
  if tg_op='UPDATE' then old_data:=to_jsonb(old); end if;
  if tg_table_name='drawing_notes' then
    if tg_op<>'UPDATE' or row_data->>'status'<>'ready' or old_data->>'status'='ready' then return new; end if;
  elsif tg_table_name='plan_attachments' then
    if tg_op<>'UPDATE' or row_data->>'ready'<>'true' or old_data->>'ready'='true' then return new; end if;
  elsif tg_table_name in ('memory_media','milestone_media') then
    if tg_op<>'UPDATE' or row_data->>'state'<>'ready' or old_data->>'state'='ready' then return new; end if;
  elsif tg_op='UPDATE' and (row_data - 'updated_at' - 'completed_by' - 'completed_at') =
    (old_data - 'updated_at' - 'completed_by' - 'completed_at') then return new;
  end if;
  target_id := (row_data->>'id')::uuid;
  if tg_table_name='plan_checklist_items' or tg_table_name='plan_reminders' or tg_table_name='plan_attachments' then
    target_id:=(row_data->>'plan_id')::uuid;
    select couple_id into partner_couple from public.plans where id=target_id;
  elsif tg_table_name='bucket_item_subtasks' then
    target_id:=(row_data->>'item_id')::uuid;
    select couple_id into partner_couple from public.bucket_list_items where id=target_id;
  elsif tg_table_name='memory_media' then
    target_id:=(row_data->>'memory_id')::uuid;
    select couple_id into partner_couple from public.memories where id=target_id;
  elsif tg_table_name='milestone_media' then
    target_id:=(row_data->>'milestone_id')::uuid;
    select couple_id into partner_couple from public.milestones where id=target_id;
  elsif tg_table_name='notes' then
    if row_data->>'type'<>'shared' or old_data->>'type'<>'shared' then return new; end if;
    partner_couple:=(row_data->>'couple_id')::uuid;
  elsif tg_table_name='entry_comments' then
    target_id:=coalesce((row_data->>'memory_id')::uuid,(row_data->>'milestone_id')::uuid);
    if row_data->>'milestone_id' is not null then category:='milestone'; target_type:='milestone'; end if;
    if row_data->>'memory_id' is not null then
      select couple_id into partner_couple from public.memories where id=target_id;
    else
      select couple_id into partner_couple from public.milestones where id=target_id;
    end if;
  elsif tg_table_name='media_comments' then
    if row_data->>'memory_media_id' is not null then
      select memory.id,memory.couple_id into target_id,partner_couple
      from public.memory_media media join public.memories memory on memory.id=media.memory_id
      where media.id=(row_data->>'memory_media_id')::uuid;
    else
      category:='milestone'; target_type:='milestone';
      select moment.id,moment.couple_id into target_id,partner_couple
      from public.milestone_media media join public.milestones moment on moment.id=media.milestone_id
      where media.id=(row_data->>'milestone_media_id')::uuid;
    end if;
  else
    partner_couple:=(row_data->>'couple_id')::uuid;
  end if;
  actor:=coalesce(actor,(row_data->>coalesce(tg_argv[3],'created_by'))::uuid);
  if tg_table_name in ('memory_media','milestone_media','entry_comments','media_comments','drawing_notes','notes','plan_attachments') then
    actor:=(row_data->>coalesce(tg_argv[3],'created_by'))::uuid;
  end if;
  if partner_couple is null or target_id is null or actor is null then return new; end if;
  if tg_table_name='plans' and tg_op='UPDATE' and row_data->>'status'='completed' and old_data->>'status'<>'completed' then title:='A plan was completed'; end if;
  if tg_table_name='bucket_list_items' and tg_op='UPDATE' and row_data->>'status'='completed' and old_data->>'status'<>'completed' then title:='A bucket idea was completed'; end if;
  insert into public.notifications(recipient_id,couple_id,category,title,target_type,target_id,idempotency_key)
  select member.user_id,partner_couple,category,title,target_type,target_id,
    'activity:'||tg_table_name||':'||(row_data->>'id')||':'||
    case when tg_op='INSERT' then 'created' else gen_random_uuid()::text end||':'||member.user_id::text
  from public.couple_memberships member
  left join public.notification_preferences preference on preference.user_id=member.user_id
  where member.couple_id=partner_couple and member.left_at is null and member.user_id<>actor
    and coalesce(preference.in_app_enabled,true)
    and case category
      when 'plan' then coalesce(preference.plans_enabled,true)
      when 'memory' then coalesce(preference.memories_enabled,true)
      when 'milestone' then coalesce(preference.milestones_enabled,true)
      when 'bucket' then coalesce(preference.bucket_enabled,true)
      when 'wishlist' then coalesce(preference.wishlist_enabled,true)
      when 'drawing' then coalesce(preference.drawings_enabled,true)
      when 'note' then coalesce(preference.notes_enabled,true)
      else false end
  on conflict(idempotency_key) do nothing;
  return new;
end $$;
revoke all on function private.partner_activity() from public,anon,authenticated;
create trigger bucket_lists_activity after insert or update on public.bucket_lists for each row execute function private.partner_activity('bucket','bucket_list','A bucket list changed');
create trigger bucket_items_activity after insert or update on public.bucket_list_items for each row execute function private.partner_activity('bucket','bucket','A bucket idea changed');
create trigger plans_activity after insert or update on public.plans for each row execute function private.partner_activity('plan','plan','A plan changed');
create trigger memories_activity after insert or update on public.memories for each row execute function private.partner_activity('memory','memory','A memory changed');
create trigger moments_activity after update on public.milestones for each row execute function private.partner_activity('milestone','milestone','A moment changed');
create trigger wishlist_activity after insert or update on public.wishlist_items for each row execute function private.partner_activity('wishlist','wishlist','A wish changed','owner_id');
create trigger drawings_activity after update on public.drawing_notes for each row execute function private.partner_activity('drawing','drawing','A drawing was sent','author_id');
create trigger plan_checklist_activity after insert or update on public.plan_checklist_items for each row execute function private.partner_activity('plan','plan','A plan checklist changed');
create trigger plan_reminder_activity after insert on public.plan_reminders for each row execute function private.partner_activity('plan','plan','A plan reminder was added');
create trigger plan_attachment_activity after update on public.plan_attachments for each row execute function private.partner_activity('plan','plan','A plan attachment was added','uploaded_by');
create trigger bucket_subtask_activity after insert or update on public.bucket_item_subtasks for each row execute function private.partner_activity('bucket','bucket','A bucket step changed');
create trigger shared_note_edit_activity after update of title,body on public.notes for each row execute function private.partner_activity('note','note','A shared note was updated','author_id');
create trigger memory_media_activity after update on public.memory_media for each row execute function private.partner_activity('memory','memory','A photo or video was added');
create trigger moment_media_activity after update on public.milestone_media for each row execute function private.partner_activity('milestone','milestone','A photo or video was added to a moment');
create trigger entry_comments_activity after insert on public.entry_comments for each row execute function private.partner_activity('memory','memory','A comment was added');
create trigger media_comments_activity after insert on public.media_comments for each row execute function private.partner_activity('memory','memory','A photo or video received a comment');




-- Native clients can mark a row read through POST without relying on PATCH support.
create function public.mark_notification_read(notification_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  update public.notifications set read_at=now()
  where id=notification_id and recipient_id=auth.uid() and read_at is null;
  get diagnostics changed=row_count;
  return changed=1;
end $$;
revoke all on function public.mark_notification_read(uuid) from public,anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
-- Remove destination links when shared records are deleted.
create function private.remove_partner_activity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from public.notifications where target_type=tg_argv[0] and target_id=old.id;
  return old;
end $$;
revoke all on function private.remove_partner_activity() from public,anon,authenticated;
create trigger bucket_list_activity_remove after delete on public.bucket_lists for each row execute function private.remove_partner_activity('bucket_list');
create trigger bucket_item_activity_remove after delete on public.bucket_list_items for each row execute function private.remove_partner_activity('bucket');
create trigger plan_activity_remove after delete on public.plans for each row execute function private.remove_partner_activity('plan');
create trigger memory_activity_remove after delete on public.memories for each row execute function private.remove_partner_activity('memory');
create trigger wishlist_activity_remove after delete on public.wishlist_items for each row execute function private.remove_partner_activity('wishlist');
create trigger drawing_activity_remove after delete on public.drawing_notes for each row execute function private.remove_partner_activity('drawing');
