-- ============================================================================
-- MIRYEO K-Beauty Growth AX — Supabase 일괄 설치 (자동 생성 파일, 직접 수정 금지)
-- 생성: node scripts/build-setup-sql.mjs · 원본: supabase/migrations/001·002·003·005·006·007 · sha 98a69538326b
--
-- 사용: **새** Supabase 프로젝트 > SQL Editor > 이 파일 전체를 붙여 넣고 Run (1회).
--   - 이미 001~003을 실행한 프로젝트에는 쓰지 않는다 (정책 중복으로 실패). 그때는 남은 번호 파일만 실행.
--   - Demo seed(004)는 포함하지 않는다.
--   - 하나의 트랜잭션으로 실행된다: 중간에 실패하면 아무것도 바뀌지 않는다.
-- 확인: 실행 후 앱의 '공개 전 점검'(/ax/system) 화면에서 데이터베이스 항목이 모두 정상인지 본다.
-- ============================================================================

begin;

-- ───────────── 001_base_schema.sql ─────────────
-- MIRYEO K-Beauty Growth AX — 001 Base Schema (PILOT)
-- 과도한 ERP Schema를 만들지 않는다. MVP 운영·실증에 필요한 필드만 정의.

create extension if not exists pgcrypto;

-- ---------- Organization / Membership ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pilot_started_on date,                       -- 12주 실증 Week 0 (OWNER 지정)
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','STAFF')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------- Product / Inventory / Production ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  name text not null,
  name_en text,
  category text not null,
  line text,
  price numeric(12,0) not null default 0,
  cost numeric(12,0),                          -- 민감: STAFF 비노출 (앱 레벨)
  status text not null default '신규' check (status in ('성장','안정','부진','신규')),
  description text,
  concerns text[] not null default '{}',
  texture text check (texture in ('가벼움','중간','리치')),
  routine_step int check (routine_step between 1 and 4),
  is_new boolean not null default false,
  is_best boolean not null default false,
  is_published boolean not null default false, -- Customer Platform 노출
  purchase_links jsonb not null default '[]',  -- [{label,url}] 고객용 구매채널
  main_channel_ids uuid[] not null default '{}',
  featured_until timestamptz,                  -- AX Action 결과로 고객화면 노출 (Closed Loop)
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  current_stock int not null default 0,
  safety_stock int not null default 0,
  incoming_stock int not null default 0,
  incoming_date date,
  updated_at timestamptz not null default now(),
  unique (product_id)
);

create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  partner text not null,
  last_produced_at date,
  quantity int not null default 0,
  expected_arrival date,
  status text not null default '계획' check (status in ('계획','생산중','입고예정','완료')),
  next_recommended_at date,
  created_at timestamptz not null default now()
);

-- ---------- Channel / Sales / B2B / Export ----------
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null check (type in ('직영몰','온라인몰','오프라인','라이브/인플루언서','B2B','수출')),
  avg_discount_rate numeric(5,4) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  sale_date date not null,                     -- 일 또는 주 단위 집계일
  units int not null check (units >= 0),
  revenue numeric(14,0) not null default 0,
  source text not null default 'manual',       -- manual / csv / api / seed
  created_at timestamptz not null default now()
);

create table if not exists public.b2b_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default '협의중' check (status in ('거래중','협의중','휴면')),
  last_order_at date,
  total_revenue numeric(14,0) not null default 0,
  main_product_ids uuid[] not null default '{}',
  next_delivery date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.export_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  region text not null,
  channel text,
  total_revenue numeric(14,0) not null default 0,
  main_product_ids uuid[] not null default '{}',
  last_order_at date,
  growth_rate numeric(6,4),
  created_at timestamptz not null default now()
);

-- ---------- Customer ----------
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text,                           -- 개인정보 최소화 (마스킹 권장)
  joined_at date,
  last_order_at date,
  order_count int not null default 0,
  favorite_product_ids uuid[] not null default '{}',
  concerns text[] not null default '{}',
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id text not null,                    -- 익명 세션
  event_type text not null check (event_type in (
    'view_product','wishlist_add','wishlist_remove','finder_start','finder_complete',
    'passport_save','recommendation_view','outbound_purchase_click')),
  product_id uuid references public.products(id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.beauty_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id text not null,
  concerns text[] not null default '{}',
  care_goal text, texture text, routine_level text, budget text,
  created_at timestamptz not null default now()
);

create table if not exists public.beauty_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id text not null,
  beauty_profile_id uuid references public.beauty_profiles(id) on delete set null,
  product_ids uuid[] not null default '{}',
  reasons jsonb not null default '{}',
  saved_to_passport boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- AX: Growth Action / Action Event / Proof Event ----------
create table if not exists public.growth_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_key text not null,                      -- 예: interest:<product_id>
  category text not null,
  priority text not null check (priority in ('우선','높음','중간')),
  title text not null,
  judgement text not null,
  evidence jsonb not null default '[]',
  impact jsonb not null default '[]',
  recommendation text not null,
  decision_method text not null default 'RULE',
  proof_type text not null default 'MANUAL',
  snapshot jsonb not null default '[]',        -- 생성 시점 KPI 스냅샷
  linked_product_id uuid references public.products(id) on delete set null,
  href text,
  status text not null default 'NEW' check (status in ('NEW','REVIEWED','IN_PROGRESS','DONE','DISMISSED')),
  assignee_user_id uuid references auth.users(id),
  assignee_name text,
  approved_by text,
  approved_at timestamptz,
  execution_note text,
  result_note text,
  dismiss_reason text,
  customer_effect text,                        -- 'feature_product' 등 사람이 선택한 고객화면 반영
  kpi_before jsonb,
  kpi_after jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.action_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  growth_action_id uuid not null references public.growth_actions(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  user_id uuid references auth.users(id),
  actor_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.proof_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  growth_action_id uuid references public.growth_actions(id) on delete set null,
  event_type text not null,
  trigger text not null,
  decision text not null,
  decision_method text not null,
  why text,
  human_approval text,
  action text,
  result text,
  kpi_before jsonb,
  kpi_after jsonb,
  data_source text not null,
  user_id uuid references auth.users(id),
  actor_name text,
  created_at timestamptz not null default now(),
  result_confirmed_at timestamptz,
  evidence_link text,
  status text not null default 'RECORDED' check (status in ('RECORDED','RESULT_CONFIRMED','REJECTED'))
);

create table if not exists public.tech_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('특허','벤처기업확인','연구개발 조직','기술인증','실증자료')),
  title text,
  status text not null default '미확인' check (status in ('미확인','준비중','검토중','출원예정','출원완료','인증완료','해당없음')),
  reference_no text,                           -- 실제 번호만 입력 (임의 생성 금지)
  note text,
  updated_at timestamptz not null default now()
);

-- ---------- Helper functions ----------
create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members m where m.organization_id = org and m.user_id = auth.uid());
$$;

create or replace function public.member_role(org uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from organization_members m where m.organization_id = org and m.user_id = auth.uid();
$$;

-- 최초 OWNER 부트스트랩: 로그인한 사용자가 아직 어느 조직에도 속하지 않았을 때만 조직 생성 + OWNER 지정
create or replace function public.bootstrap_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from organization_members where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization';
  end if;
  insert into organizations(name) values (org_name) returning id into new_org;
  insert into organization_members(organization_id, user_id, role) values (new_org, auth.uid(), 'OWNER');
  insert into profiles(id, display_name) values (auth.uid(), null) on conflict (id) do nothing;
  return new_org;
end $$;

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists trg_inventory_touch on public.inventory;
create trigger trg_inventory_touch before update on public.inventory for each row execute function public.touch_updated_at();
drop trigger if exists trg_actions_touch on public.growth_actions;
create trigger trg_actions_touch before update on public.growth_actions for each row execute function public.touch_updated_at();

-- ───────────── 002_indexes.sql ─────────────
-- 002 Indexes
create index if not exists idx_members_user on public.organization_members(user_id);
create index if not exists idx_products_org on public.products(organization_id);
create index if not exists idx_products_published on public.products(organization_id) where is_published;
create index if not exists idx_inventory_org on public.inventory(organization_id);
create index if not exists idx_production_org on public.production_plans(organization_id, product_id);
create index if not exists idx_channels_org on public.channels(organization_id);
create index if not exists idx_sales_org_date on public.sales_records(organization_id, sale_date desc);
create index if not exists idx_sales_product on public.sales_records(product_id, sale_date);
create index if not exists idx_events_org_time on public.customer_events(organization_id, created_at desc);
create index if not exists idx_events_product on public.customer_events(product_id, event_type, created_at);
create index if not exists idx_events_session on public.customer_events(session_id);
create index if not exists idx_actions_org_status on public.growth_actions(organization_id, status);
-- 같은 규칙의 "열린" Action은 하나만 (DONE/DISMISSED 이후 재발생 허용)
create unique index if not exists uq_actions_open_rule on public.growth_actions(organization_id, rule_key)
  where status not in ('DONE','DISMISSED');
create index if not exists idx_action_events_action on public.action_events(growth_action_id, created_at);
create index if not exists idx_proof_org_time on public.proof_events(organization_id, created_at desc);

-- ───────────── 003_rls.sql ─────────────
-- 003 Row Level Security — organization membership 기준
-- OWNER / ADMIN / STAFF. 익명(anon)은 고객 이벤트 insert와 공개 상품 조회만 가능.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.production_plans enable row level security;
alter table public.channels enable row level security;
alter table public.sales_records enable row level security;
alter table public.b2b_accounts enable row level security;
alter table public.export_records enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_events enable row level security;
alter table public.beauty_profiles enable row level security;
alter table public.beauty_recommendations enable row level security;
alter table public.growth_actions enable row level security;
alter table public.action_events enable row level security;
alter table public.proof_events enable row level security;
alter table public.tech_assets enable row level security;

-- organizations
create policy org_select on public.organizations for select using (public.is_member(id));
create policy org_update on public.organizations for update using (public.member_role(id) = 'OWNER');

-- profiles
create policy profile_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy profile_same_org on public.profiles for select using (
  exists (select 1 from organization_members a join organization_members b on a.organization_id = b.organization_id
          where a.user_id = auth.uid() and b.user_id = profiles.id));

-- members
create policy members_select on public.organization_members for select using (public.is_member(organization_id));
create policy members_owner_write on public.organization_members for all
  using (public.member_role(organization_id) = 'OWNER') with check (public.member_role(organization_id) = 'OWNER');

-- products: 구성원 전체 조회 + 공개 상품은 누구나 조회, 수정은 OWNER/ADMIN
create policy products_member_select on public.products for select using (public.is_member(organization_id));
create policy products_public_select on public.products for select to anon, authenticated using (is_published);
create policy products_admin_write on public.products for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- inventory: 구성원 전체 조회·입력, 삭제는 OWNER/ADMIN
create policy inventory_select on public.inventory for select using (public.is_member(organization_id));
create policy inventory_insert on public.inventory for insert with check (public.is_member(organization_id));
create policy inventory_update on public.inventory for update using (public.is_member(organization_id));
create policy inventory_delete on public.inventory for delete using (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- production / channels: 조회 구성원, 수정 OWNER/ADMIN
create policy production_select on public.production_plans for select using (public.is_member(organization_id));
create policy production_write on public.production_plans for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));
create policy channels_select on public.channels for select using (public.is_member(organization_id));
create policy channels_write on public.channels for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- sales: 조회·입력 구성원, 수정/삭제 OWNER/ADMIN
create policy sales_select on public.sales_records for select using (public.is_member(organization_id));
create policy sales_insert on public.sales_records for insert with check (public.is_member(organization_id));
create policy sales_modify on public.sales_records for update using (public.member_role(organization_id) in ('OWNER','ADMIN'));
create policy sales_delete on public.sales_records for delete using (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- B2B / Export: 거래조건 민감 → OWNER/ADMIN만
create policy b2b_rw on public.b2b_accounts for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));
create policy export_rw on public.export_records for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- customer profiles: OWNER/ADMIN
create policy customers_rw on public.customer_profiles for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- customer events: 익명 insert 허용(조직 존재 확인), 조회는 구성원
create policy events_public_insert on public.customer_events for insert to anon, authenticated
  with check (exists (select 1 from organizations o where o.id = organization_id));
create policy events_member_select on public.customer_events for select using (public.is_member(organization_id));

create policy bprof_public_insert on public.beauty_profiles for insert to anon, authenticated
  with check (exists (select 1 from organizations o where o.id = organization_id));
create policy bprof_member_select on public.beauty_profiles for select using (public.is_member(organization_id));
create policy brec_public_insert on public.beauty_recommendations for insert to anon, authenticated
  with check (exists (select 1 from organizations o where o.id = organization_id));
create policy brec_member_select on public.beauty_recommendations for select using (public.is_member(organization_id));

-- growth actions / action events: 구성원 조회·생성·갱신 (승인 권한은 앱 레벨에서 추가 제한)
create policy actions_select on public.growth_actions for select using (public.is_member(organization_id));
create policy actions_insert on public.growth_actions for insert with check (public.is_member(organization_id));
create policy actions_update on public.growth_actions for update using (public.is_member(organization_id));
create policy action_events_select on public.action_events for select using (public.is_member(organization_id));
create policy action_events_insert on public.action_events for insert with check (public.is_member(organization_id));

-- proof events: 구성원 기록, 결과 확정(update)은 OWNER만
create policy proof_select on public.proof_events for select using (public.is_member(organization_id));
create policy proof_insert on public.proof_events for insert with check (public.is_member(organization_id));
create policy proof_owner_update on public.proof_events for update using (public.member_role(organization_id) = 'OWNER');

-- tech assets: 조회 구성원, 수정 OWNER
create policy tech_select on public.tech_assets for select using (public.is_member(organization_id));
create policy tech_owner_write on public.tech_assets for all
  using (public.member_role(organization_id) = 'OWNER') with check (public.member_role(organization_id) = 'OWNER');

-- ───────────── 005_pilot_v2_pass2.sql ─────────────
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

-- ───────────── 006_event_guard.sql ─────────────
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

-- ───────────── 007_stage2_customers_settlements.sql ─────────────
-- 007 계약 2단계 보완 — 고객 회원·뷰티 기록·구매이력·재구매 / 정산·미수금 / 제품 사용기간
-- 001~006 적용 후 실행. 재실행 안전.
-- 개인정보: 실제 고객 가입 전 가연인터내셔널의 개인정보 처리방침·동의 문구 확정 필요 (계약 제17조, 별지 제6호)

-- ---------- 제품 사용기간 (재구매 예상시점 계산) ----------
alter table public.products add column if not exists usage_days int check (usage_days between 1 and 365);

-- ---------- 고객 계정 (Supabase Auth 사용자 중 "고객") ----------
create table if not exists public.customer_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text,                                   -- auth.users에서 복사 (운영자가 구매 기록 연결용)
  display_name text,
  skin_concerns text[] not null default '{}',
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  privacy_agreed_at timestamptz not null,       -- 필수 동의 시각
  privacy_version text not null,                -- 동의한 처리방침 버전
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customer_accounts_org on public.customer_accounts(organization_id, created_at desc);

create or replace function public.fill_customer_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email := (select email from auth.users where id = new.user_id);
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  if new.marketing_consent and (tg_op = 'INSERT' or not old.marketing_consent) then new.marketing_consent_at := now(); end if;
  if not new.marketing_consent then new.marketing_consent_at := null; end if;
  return new;
end $$;
drop trigger if exists trg_customer_account_fill on public.customer_accounts;
create trigger trg_customer_account_fill before insert or update on public.customer_accounts for each row execute function public.fill_customer_account();

-- ---------- 추천 기록을 계정에 연결 ----------
alter table public.beauty_profiles add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
alter table public.beauty_recommendations add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_brec_customer on public.beauty_recommendations(customer_user_id, created_at desc);

-- ---------- 구매이력 (외부 채널 구매: 고객 자기기록 또는 운영자 입력) ----------
create table if not exists public.customer_purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 99),
  purchased_on date not null,
  channel_label text,
  source text not null check (source in ('SELF','STAFF')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_customer on public.customer_purchases(customer_user_id, purchased_on desc);
create index if not exists idx_purchases_org on public.customer_purchases(organization_id, purchased_on desc);

-- ---------- 정산·미수금 ----------
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('B2B','EXPORT','CHANNEL','OTHER')),
  counterparty text not null,                   -- 거래처·채널·권역 이름
  ref_id uuid,                                  -- b2b_accounts.id / channels.id (선택)
  description text,
  amount numeric(14,0) not null check (amount >= 0),
  paid_amount numeric(14,0) not null default 0 check (paid_amount >= 0),
  issued_on date not null,
  due_on date,
  paid_on date,
  status text not null default 'OPEN' check (status in ('OPEN','PARTIAL','PAID','CANCELLED')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_amount <= amount),
  check (due_on is null or due_on >= issued_on)
);
create index if not exists idx_settlements_org on public.settlements(organization_id, status, due_on);
drop trigger if exists trg_settlements_touch on public.settlements;
create trigger trg_settlements_touch before update on public.settlements for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.customer_accounts enable row level security;
alter table public.customer_purchases enable row level security;
alter table public.settlements enable row level security;

drop policy if exists cacc_self_select on public.customer_accounts;
create policy cacc_self_select on public.customer_accounts for select using (user_id = auth.uid());
drop policy if exists cacc_self_insert on public.customer_accounts;
create policy cacc_self_insert on public.customer_accounts for insert to authenticated
  with check (user_id = auth.uid() and public.org_exists(organization_id)
              and not exists (select 1 from public.organization_members m where m.user_id = auth.uid()));
drop policy if exists cacc_self_update on public.customer_accounts;
create policy cacc_self_update on public.customer_accounts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists cacc_self_delete on public.customer_accounts;
create policy cacc_self_delete on public.customer_accounts for delete using (user_id = auth.uid());
-- 고객 개인정보: 대표·관리자만 (직원 제외)
drop policy if exists cacc_admin_select on public.customer_accounts;
create policy cacc_admin_select on public.customer_accounts for select using (public.member_role(organization_id) in ('OWNER','ADMIN'));

drop policy if exists cpur_self_select on public.customer_purchases;
create policy cpur_self_select on public.customer_purchases for select using (customer_user_id = auth.uid());
drop policy if exists cpur_self_insert on public.customer_purchases;
create policy cpur_self_insert on public.customer_purchases for insert to authenticated
  with check (customer_user_id = auth.uid() and source = 'SELF'
              and exists (select 1 from public.customer_accounts a where a.user_id = auth.uid() and a.organization_id = customer_purchases.organization_id)
              and public.product_in_org(product_id, organization_id));
drop policy if exists cpur_self_delete on public.customer_purchases;
create policy cpur_self_delete on public.customer_purchases for delete using (customer_user_id = auth.uid() and source = 'SELF');
drop policy if exists cpur_admin_all on public.customer_purchases;
create policy cpur_admin_all on public.customer_purchases for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN') and source = 'STAFF'
              and exists (select 1 from public.customer_accounts a where a.user_id = customer_purchases.customer_user_id and a.organization_id = customer_purchases.organization_id));

drop policy if exists settle_rw on public.settlements;
create policy settle_rw on public.settlements for all
  using (public.member_role(organization_id) in ('OWNER','ADMIN'))
  with check (public.member_role(organization_id) in ('OWNER','ADMIN'));

-- 고객은 자기 추천 기록 조회 가능, 저장 시 계정 연결은 본인만
drop policy if exists brec_self_select on public.beauty_recommendations;
create policy brec_self_select on public.beauty_recommendations for select using (customer_user_id = auth.uid());
drop policy if exists bprof_self_select on public.beauty_profiles;
create policy bprof_self_select on public.beauty_profiles for select using (customer_user_id = auth.uid());
drop policy if exists bprof_public_insert on public.beauty_profiles;
create policy bprof_public_insert on public.beauty_profiles for insert to anon, authenticated
  with check (public.org_exists(organization_id) and (customer_user_id is null or customer_user_id = auth.uid()));
drop policy if exists brec_public_insert on public.beauty_recommendations;
create policy brec_public_insert on public.beauty_recommendations for insert to anon, authenticated
  with check (public.org_exists(organization_id) and (customer_user_id is null or customer_user_id = auth.uid()));

-- 가입 전 익명으로 저장한 추천 결과를 내 계정으로 가져오기 (같은 브라우저 session_id)
create or replace function public.claim_session(p_session text)
returns int language plpgsql security definer set search_path = public as $$
declare org uuid; n int := 0; k int;
begin
  select organization_id into org from customer_accounts where user_id = auth.uid();
  if org is null then raise exception 'customer account required'; end if;
  update beauty_profiles set customer_user_id = auth.uid() where session_id = p_session and customer_user_id is null and organization_id = org;
  get diagnostics k = row_count; n := n + k;
  update beauty_recommendations set customer_user_id = auth.uid() where session_id = p_session and customer_user_id is null and organization_id = org;
  get diagnostics k = row_count; n := n + k;
  return n;
end $$;

-- 고객 계정은 운영 조직을 만들 수 없음
create or replace function public.bootstrap_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from organization_members where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization';
  end if;
  if exists (select 1 from customer_accounts where user_id = auth.uid()) then
    raise exception 'customer accounts cannot create an organization';
  end if;
  insert into organizations(name) values (org_name) returning id into new_org;
  insert into organization_members(organization_id, user_id, role) values (new_org, auth.uid(), 'OWNER');
  insert into profiles(id, display_name) values (auth.uid(), null) on conflict (id) do nothing;
  return new_org;
end $$;

commit;
