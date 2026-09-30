-- 005 PILOT V2 PASS 2 — Baseline Lock / AX OWNER / RLS 보강 / Realtime
-- 001~004 적용 후 실행. 여러 번 실행해도 안전(idempotent).

-- ---------- AX OWNER (실증 책임자: 로그인 역할과 별개) ----------
alter table public.organizations add column if not exists ax_owner_name text;

-- ---------- KPI Baseline Lock ----------
-- 기준값은 덮어쓰지 않는다. 새로 잠그면 이전 행에 superseded_at을 기록 → 변경 이력이 증빙으로 남는다.
create table if not exists public.kpi_baselines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kpi_key text not null check (kpi_key in ('COST','REVENUE','SCALE')),
  value numeric not null check (value >= 0),
  unit text not null,
  period_from date,
  period_to date,
  method text not null,                          -- 측정 방법 (어떻게 쟀는가)
  source text not null check (source in ('SYSTEM','SELF_REPORT','DOCUMENT')),
  note text,
  locked_by text,
  user_id uuid references auth.users(id),
  locked_at timestamptz not null default now(),
  superseded_at timestamptz,
  check (period_to is null or period_from is null or period_to >= period_from)
);
create index if not exists idx_baselines_org on public.kpi_baselines(organization_id, kpi_key, locked_at desc);
create unique index if not exists uq_baselines_active on public.kpi_baselines(organization_id, kpi_key) where superseded_at is null;

alter table public.kpi_baselines enable row level security;
drop policy if exists baselines_select on public.kpi_baselines;
create policy baselines_select on public.kpi_baselines for select using (public.is_member(organization_id));
drop policy if exists baselines_owner_insert on public.kpi_baselines;
create policy baselines_owner_insert on public.kpi_baselines for insert with check (public.member_role(organization_id) = 'OWNER');
drop policy if exists baselines_owner_update on public.kpi_baselines;
create policy baselines_owner_update on public.kpi_baselines for update using (public.member_role(organization_id) = 'OWNER');

-- 잠금 = 이전 활성 기준값 superseded + 새 행 insert 를 한 트랜잭션으로 (security invoker → RLS 적용)
create or replace function public.lock_baseline(
  org uuid, p_kpi text, p_value numeric, p_unit text, p_from date, p_to date,
  p_method text, p_source text, p_note text, p_locked_by text)
returns uuid language plpgsql security invoker set search_path = public as $$
declare new_id uuid;
begin
  if public.member_role(org) is distinct from 'OWNER' then raise exception 'baseline lock requires OWNER'; end if;
  update kpi_baselines set superseded_at = now() where organization_id = org and kpi_key = p_kpi and superseded_at is null;
  insert into kpi_baselines(organization_id, kpi_key, value, unit, period_from, period_to, method, source, note, locked_by, user_id)
    values (org, p_kpi, p_value, p_unit, p_from, p_to, p_method, p_source, p_note, p_locked_by, auth.uid())
    returning id into new_id;
  return new_id;
end $$;

-- ---------- Growth Action 상태 전이 가드 ----------
-- 앱 권한과 동일: 승인(REVIEWED→IN_PROGRESS)·보류(→DISMISSED)는 OWNER/ADMIN. 허용되지 않은 전이는 거부.
create or replace function public.guard_action_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if new.organization_id <> old.organization_id or new.rule_key <> old.rule_key then
    raise exception 'organization_id / rule_key cannot change';
  end if;
  if new.status is distinct from old.status then
    if not ((old.status = 'NEW' and new.status in ('REVIEWED','DISMISSED'))
         or (old.status = 'REVIEWED' and new.status in ('IN_PROGRESS','DISMISSED'))
         or (old.status = 'IN_PROGRESS' and new.status = 'DONE')) then
      raise exception 'invalid action transition % -> %', old.status, new.status;
    end if;
    if auth.uid() is not null then
      r := public.member_role(new.organization_id);
      if new.status in ('IN_PROGRESS','DISMISSED') and r not in ('OWNER','ADMIN') then
        raise exception 'approve/dismiss requires OWNER or ADMIN';
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_actions_guard on public.growth_actions;
create trigger trg_actions_guard before update on public.growth_actions for each row execute function public.guard_action_update();

-- ---------- RLS 보강 ----------
-- Action은 NEW 상태로만 생성
drop policy if exists actions_insert on public.growth_actions;
create policy actions_insert on public.growth_actions for insert with check (public.is_member(organization_id) and status = 'NEW');
-- Proof는 RECORDED로만 기록 (확정은 OWNER의 update)
drop policy if exists proof_insert on public.proof_events;
create policy proof_insert on public.proof_events for insert
  with check (public.is_member(organization_id) and (status = 'RECORDED' or public.member_role(organization_id) = 'OWNER'));
-- 익명 이벤트: anon은 organizations/비공개 products를 조회할 수 없으므로(RLS) 존재 확인은 security definer 함수로
create or replace function public.org_exists(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organizations where id = org);
$$;
create or replace function public.product_in_org(prod uuid, org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select prod is null or exists (select 1 from products where id = prod and organization_id = org);
$$;
drop policy if exists events_public_insert on public.customer_events;
create policy events_public_insert on public.customer_events for insert to anon, authenticated
  with check (public.org_exists(organization_id) and public.product_in_org(product_id, organization_id));
drop policy if exists bprof_public_insert on public.beauty_profiles;
create policy bprof_public_insert on public.beauty_profiles for insert to anon, authenticated
  with check (public.org_exists(organization_id));
drop policy if exists brec_public_insert on public.beauty_recommendations;
create policy brec_public_insert on public.beauty_recommendations for insert to anon, authenticated
  with check (public.org_exists(organization_id));

-- ---------- Realtime (Supabase) ----------
-- AX 화면의 실시간 반영(customer_events, growth_actions). publication이 없는 환경에서는 건너뛴다.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.customer_events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.growth_actions; exception when duplicate_object then null; end;
  end if;
end $$;
