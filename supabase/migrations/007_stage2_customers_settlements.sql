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
