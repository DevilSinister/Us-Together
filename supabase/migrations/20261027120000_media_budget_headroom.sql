-- The phase-6 budgets (60 allocations and 120 processing calls per hour, 120
-- signed reads per minute) were set before bulk uploads and the gallery
-- existed. One 30-file batch plus its retries exhausted the hourly upload
-- budget, which parked every remaining file for up to an hour, and a gallery
-- page with videos and viewer neighbours exceeded the read budget, which left
-- thumbnails broken. Per-memory quotas still bound stored bytes and files.
create or replace function public.consume_memory_media_budget(kind text) returns boolean language plpgsql security invoker set search_path='' as $$
declare window_length interval; max_requests integer; affected integer;
begin
 if auth.uid() is null then return false;end if;
 case kind when 'upload' then window_length:=interval '1 hour';max_requests:=300;
 when 'process' then window_length:=interval '1 hour';max_requests:=600;
 when 'view' then window_length:=interval '1 minute';max_requests:=600;
 when 'location' then window_length:=interval '1 minute';max_requests:=60;
 else raise invalid_parameter_value using message='Unknown media budget';end case;
 insert into private.media_request_budgets as b(user_id,bucket,requests) values(auth.uid(),kind,1)
 on conflict(user_id,bucket) do update set
 requests=case when b.window_start<=now()-window_length then 1 else b.requests+1 end,
 window_start=case when b.window_start<=now()-window_length then now() else b.window_start end
 where b.window_start<=now()-window_length or b.requests<max_requests;
 get diagnostics affected=row_count;
 return affected=1;
end $$;
revoke all on function public.consume_memory_media_budget(text) from public,anon;
grant execute on function public.consume_memory_media_budget(text) to authenticated;
