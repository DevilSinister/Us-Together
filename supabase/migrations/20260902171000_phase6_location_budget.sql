alter table private.media_request_budgets drop constraint media_request_budgets_bucket_check;
alter table private.media_request_budgets add constraint media_request_budgets_bucket_check check(bucket in ('upload','process','view','location'));
create or replace function public.consume_memory_media_budget(kind text) returns boolean language plpgsql security invoker set search_path='' as $$
declare window_length interval; max_requests integer; affected integer;
begin
 if auth.uid() is null then return false;end if;
 case kind when 'upload' then window_length:=interval '1 hour';max_requests:=60;
 when 'process' then window_length:=interval '1 hour';max_requests:=120;
 when 'view' then window_length:=interval '1 minute';max_requests:=120;
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
