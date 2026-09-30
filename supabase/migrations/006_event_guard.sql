-- 006 익명 고객 이벤트 보호 — 남용(대량 입력)·시각 조작으로 KPI가 오염되지 않도록
-- 001~005 적용 후 실행. 재실행 안전.

create index if not exists idx_events_session_time on public.customer_events(session_id, created_at desc);
create index if not exists idx_bprof_session_time on public.beauty_profiles(session_id, created_at desc);

-- 한도 (필요 시 이 함수만 수정)
create or replace function public.event_limits()
returns table (session_per_min int, org_per_min int, result_per_hour int, payload_bytes int)
language sql immutable as $$ select 60, 3000, 20, 4096 $$;

create or replace function public.guard_customer_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare lim record; n int;
begin
  select * into lim from public.event_limits();
  if new.session_id is null or length(new.session_id) not between 8 and 64 then
    raise exception 'invalid session_id' using hint = 'session_id 8~64자';
  end if;
  if pg_column_size(new.payload) > lim.payload_bytes then
    raise exception 'payload too large' using hint = format('payload ≤ %s bytes', lim.payload_bytes);
  end if;
  new.created_at := now();                     -- 기록 시각은 서버 시각 (과거·미래 시각 주입 차단)
  if auth.uid() is null then                   -- 익명 고객만 한도 적용 (구성원 입력은 제외)
    select count(*) into n from customer_events where session_id = new.session_id and created_at > now() - interval '1 minute';
    if n >= lim.session_per_min then raise exception 'rate limit exceeded (session)' using hint = format('세션당 분당 %s건', lim.session_per_min); end if;
    select count(*) into n from customer_events where organization_id = new.organization_id and created_at > now() - interval '1 minute';
    if n >= lim.org_per_min then raise exception 'rate limit exceeded (organization)' using hint = format('조직당 분당 %s건', lim.org_per_min); end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_customer_event_guard on public.customer_events;
create trigger trg_customer_event_guard before insert on public.customer_events for each row execute function public.guard_customer_event();

create or replace function public.guard_beauty_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare lim record; n int;
begin
  select * into lim from public.event_limits();
  if new.session_id is null or length(new.session_id) not between 8 and 64 then raise exception 'invalid session_id'; end if;
  new.created_at := now();
  if auth.uid() is null then
    execute format('select count(*) from %I.%I where session_id = $1 and created_at > now() - interval ''1 hour''', tg_table_schema, tg_table_name) into n using new.session_id;
    if n >= lim.result_per_hour then raise exception 'rate limit exceeded (beauty result)' using hint = format('세션당 시간당 %s건', lim.result_per_hour); end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_bprof_guard on public.beauty_profiles;
create trigger trg_bprof_guard before insert on public.beauty_profiles for each row execute function public.guard_beauty_write();
drop trigger if exists trg_brec_guard on public.beauty_recommendations;
create trigger trg_brec_guard before insert on public.beauty_recommendations for each row execute function public.guard_beauty_write();
