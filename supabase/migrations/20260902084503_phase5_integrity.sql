-- Protect bounded child collections and prevent orphaned Storage objects.
create index plan_attachments_uploaded_by_idx on public.plan_attachments(uploaded_by);
create function private.guard_plan_child_insert() returns trigger language plpgsql set search_path='' as $$
declare row_count int; max_count int;
begin
 perform id from public.plans where id=new.plan_id for update;
 if not found then raise exception using errcode='42501',message='Plan is unavailable.'; end if;
 if tg_table_name='plan_checklist_items' then select count(*) into row_count from public.plan_checklist_items where plan_id=new.plan_id;max_count=50;
 elsif tg_table_name='plan_reminders' then select count(*) into row_count from public.plan_reminders where plan_id=new.plan_id;max_count=5;
 else select count(*) into row_count from public.plan_attachments where plan_id=new.plan_id;max_count=20;
 end if;
 if row_count>=max_count then raise exception using errcode='23514',message='Plan collection limit reached.'; end if;
 return new;
end $$;
revoke all on function private.guard_plan_child_insert() from public,anon,authenticated;
create trigger checklist_insert_limit before insert on public.plan_checklist_items for each row execute function private.guard_plan_child_insert();
create trigger reminder_insert_limit before insert on public.plan_reminders for each row execute function private.guard_plan_child_insert();
create trigger attachment_insert_limit before insert on public.plan_attachments for each row execute function private.guard_plan_child_insert();
create function private.guard_plan_attachment_delete() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from storage.objects where bucket_id='plan-attachments' and name=old.object_path) then raise exception using errcode='23514',message='Remove the stored file before deleting its metadata.'; end if;
 return old;
end $$;
revoke all on function private.guard_plan_attachment_delete() from public,anon,authenticated;
create trigger attachment_delete_guard before delete on public.plan_attachments for each row execute function private.guard_plan_attachment_delete();
