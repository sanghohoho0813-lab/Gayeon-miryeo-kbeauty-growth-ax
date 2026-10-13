-- 008 PASS 10 — OEM 생산기간·최소생산수량(계약 별지 제1호 ② "외부 제조(OEM) 생산기간을 활용한 생산·재고 판단"), 월 매출 목표
-- 001~007 적용 후 실행. 재실행 안전. 새 프로젝트는 supabase/setup_all.sql 한 번이면 포함된다.

-- ---------- 상품별 OEM 생산기간·최소 생산수량 ----------
alter table public.products add column if not exists lead_time_days int check (lead_time_days between 1 and 365);
alter table public.products add column if not exists moq int check (moq between 0 and 10000000);

-- ---------- 월 매출 목표 (대표가 입력 — 시스템이 만들지 않는다) ----------
create table if not exists public.monthly_targets (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  revenue_target numeric(14,0) not null check (revenue_target > 0),
  note text check (char_length(note) <= 200),
  set_by text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, month)
);

create or replace function public.touch_monthly_target()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.set_by := coalesce((select email from auth.users where id = auth.uid()), new.set_by);
  return new;
end $$;
drop trigger if exists trg_monthly_target_touch on public.monthly_targets;
create trigger trg_monthly_target_touch before insert or update on public.monthly_targets for each row execute function public.touch_monthly_target();

alter table public.monthly_targets enable row level security;
drop policy if exists targets_select on public.monthly_targets;
create policy targets_select on public.monthly_targets for select
  using (public.member_role(organization_id) in ('OWNER','ADMIN'));
drop policy if exists targets_owner_insert on public.monthly_targets;
create policy targets_owner_insert on public.monthly_targets for insert
  with check (public.member_role(organization_id) = 'OWNER');
drop policy if exists targets_owner_update on public.monthly_targets;
create policy targets_owner_update on public.monthly_targets for update
  using (public.member_role(organization_id) = 'OWNER')
  with check (public.member_role(organization_id) = 'OWNER');
drop policy if exists targets_owner_delete on public.monthly_targets;
create policy targets_owner_delete on public.monthly_targets for delete
  using (public.member_role(organization_id) = 'OWNER');
