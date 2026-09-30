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
