-- Batch notification aggregation runs inside private.partner_activity (owned by postgres).
-- Its nested trigger may update display/count fields; recipients may only mark read.
create or replace function private.validate_notification_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'read_at' - 'title' - 'created_at' - 'activity_count')
    is distinct from
    (to_jsonb(old) - 'read_at' - 'title' - 'created_at' - 'activity_count') then
    raise exception using errcode = '42501', message = 'Notification identity cannot be changed.';
  end if;
  if (new.title is distinct from old.title
      or new.created_at is distinct from old.created_at
      or new.activity_count is distinct from old.activity_count)
    and not (current_user = 'postgres' and pg_trigger_depth() > 1) then
    raise exception using errcode = '42501', message = 'Only notification read state can be changed.';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_notification_update() from public, anon, authenticated;
