-- 011 PASS 28 — 파일 가져오기 기록·되돌리기 (D-090)
-- 판매·정산 파일을 올릴 때마다 기록을 남기고, 잘못 올린 파일은 그 파일로 들어온 행만 한 번에(한 트랜잭션) 지운다.
-- 001~010 적용 후 실행. 재실행 안전. 기존 판매·정산 행은 기록이 없어(import_batch_id null) 그대로.
-- 권한: 판매 파일 기록은 구성원 누구나(판매 입력과 같음), 정산 파일 기록은 대표·관리자. 되돌리기는 대표·관리자(판매·정산 삭제 권한과 같음).

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('sales', 'settlements')),
  file_name text not null default '' check (char_length(file_name) <= 200),
  row_count integer not null default 0 check (row_count >= 0),
  created_by uuid default auth.uid(),
  created_by_email text,
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by_email text
);
create index if not exists idx_import_batches_org on public.import_batches(organization_id, created_at desc);

alter table public.sales_records add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;
create index if not exists idx_sales_import_batch on public.sales_records(import_batch_id) where import_batch_id is not null;
alter table public.settlements add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;
create index if not exists idx_settlements_import_batch on public.settlements(import_batch_id) where import_batch_id is not null;

-- 기록자·시각은 로그인 계정·서버 시각 (위장 불가). 만든 뒤에는 '되돌림' 표시만 한 번 바꿀 수 있다.
create or replace function public.guard_import_batch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_by_email := (select email from auth.users where id = auth.uid());
    new.created_at := now();
    new.undone_at := null;
    new.undone_by_email := null;
    return new;
  end if;
  if new.organization_id <> old.organization_id or new.kind <> old.kind or new.file_name <> old.file_name
     or new.row_count <> old.row_count or new.created_by is distinct from old.created_by
     or new.created_by_email is distinct from old.created_by_email or new.created_at <> old.created_at then
    raise exception 'import batch record cannot change (only undo)';
  end if;
  if old.undone_at is not null then raise exception 'import batch already undone'; end if;
  new.undone_by_email := (select email from auth.users where id = auth.uid());
  return new;
end $$;
drop trigger if exists trg_import_batch_guard on public.import_batches;
create trigger trg_import_batch_guard before insert or update on public.import_batches for each row execute function public.guard_import_batch();

alter table public.import_batches enable row level security;
drop policy if exists import_batches_select on public.import_batches;
create policy import_batches_select on public.import_batches for select
  using (public.is_member(organization_id) and (kind = 'sales' or public.member_role(organization_id) in ('OWNER', 'ADMIN')));
drop policy if exists import_batches_insert on public.import_batches;
create policy import_batches_insert on public.import_batches for insert
  with check (public.is_member(organization_id) and (kind = 'sales' or public.member_role(organization_id) in ('OWNER', 'ADMIN')));
drop policy if exists import_batches_update on public.import_batches;
create policy import_batches_update on public.import_batches for update
  using (public.member_role(organization_id) in ('OWNER', 'ADMIN'));
-- 삭제 정책 없음: 기록은 남긴다 (조직 삭제 시에만 함께 삭제)

-- 되돌리기 = 그 파일로 들어온 판매·정산 삭제 + 기록에 '되돌림' 표시를 한 트랜잭션으로 (security invoker → RLS 그대로)
create or replace function public.undo_import(p_batch uuid)
returns json language plpgsql security invoker set search_path = public as $$
declare
  b public.import_batches;
  n_sales integer := 0;
  n_settle integer := 0;
begin
  select * into b from public.import_batches where id = p_batch;
  if not found then raise exception 'import batch not found'; end if;
  if coalesce(public.member_role(b.organization_id), '') not in ('OWNER', 'ADMIN') then
    raise exception 'undo import requires OWNER or ADMIN';
  end if;
  if b.undone_at is not null then raise exception 'import batch already undone'; end if;
  delete from public.sales_records where organization_id = b.organization_id and import_batch_id = b.id;
  get diagnostics n_sales = row_count;
  delete from public.settlements where organization_id = b.organization_id and import_batch_id = b.id;
  get diagnostics n_settle = row_count;
  update public.import_batches set undone_at = now() where id = b.id;
  return json_build_object('sales', n_sales, 'settlements', n_settle);
end $$;

comment on table public.import_batches is '파일 가져오기 기록 (PASS 28): 판매·정산 파일마다 1행 — 되돌리기(undo_import)로 그 파일의 행만 삭제';
