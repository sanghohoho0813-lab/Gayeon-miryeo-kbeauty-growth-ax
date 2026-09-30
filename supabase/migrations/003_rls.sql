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
