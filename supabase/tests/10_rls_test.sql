-- RLS / 권한 / 상태전이 검증 — 00_supabase_stub.sql + migrations 001~005 적용 후 실행
-- 실패 시 exception으로 즉시 중단(ON_ERROR_STOP). 통과 항목은 NOTICE 'PASS ...'로 출력.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema if not exists tests;
create or replace function tests.eq(actual bigint, expected bigint, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL: % (expected %, got %)', label, expected, actual; end if;
  raise notice 'PASS: %', label;
end $$;
create or replace function tests.affected(q text) returns bigint language plpgsql as $$
declare n bigint; begin execute q; get diagnostics n = row_count; return n; end $$;
create or replace function tests.fails(q text, label text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    raise notice 'PASS: % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — should have been blocked', label;
end $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'admin@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'outsider@test.local');

-- ============ OWNER: 조직 생성 + 구성원 + 기초 데이터 ============
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select bootstrap_organization('가연 Test Org') as org \gset
select tests.fails($$select bootstrap_organization('두번째')$$, 'OWNER는 조직을 두 번 만들 수 없음');
insert into organization_members(organization_id, user_id, role) values
  (:'org', '00000000-0000-0000-0000-000000000002', 'ADMIN'),
  (:'org', '00000000-0000-0000-0000-000000000003', 'STAFF');
insert into channels(id, organization_id, name, type) values ('10000000-0000-0000-0000-000000000001', :'org', '직영몰', '직영몰');
insert into products(id, organization_id, sku, name, category, price, is_published) values
  ('20000000-0000-0000-0000-000000000001', :'org', 'SKU-1', '공개 상품', '크림', 30000, true),
  ('20000000-0000-0000-0000-000000000002', :'org', 'SKU-2', '비공개 상품', '크림', 30000, false);
insert into inventory(organization_id, product_id, current_stock) values (:'org', '20000000-0000-0000-0000-000000000001', 100);
insert into sales_records(organization_id, product_id, channel_id, sale_date, units, revenue) values (:'org', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 3, 90000);
insert into b2b_accounts(organization_id, name) values (:'org', '거래처 A');
insert into export_records(organization_id, region) values (:'org', '권역 A');
insert into customer_profiles(organization_id, display_name) values (:'org', '고객*');
insert into tech_assets(organization_id, kind) values (:'org', '특허');
select tests.eq((select count(*) from organization_members where organization_id = :'org'), 3, 'OWNER가 ADMIN·STAFF 추가');
commit;

-- 다른 조직 (outsider)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select bootstrap_organization('다른 조직') as org2 \gset
insert into products(id, organization_id, sku, name, category, price, is_published) values ('20000000-0000-0000-0000-000000000009', :'org2', 'X-1', '타 조직 상품', '크림', 1000, false);
commit;

-- ============ STAFF ============
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq((select count(*) from products where organization_id = :'org'), 2, 'STAFF: 상품 조회');
select tests.eq((select count(*) from b2b_accounts), 0, 'STAFF: B2B 조회 차단');
select tests.eq((select count(*) from export_records), 0, 'STAFF: 수출 조회 차단');
select tests.eq((select count(*) from customer_profiles), 0, 'STAFF: 고객 프로필 조회 차단');
select tests.eq((select count(*) from products where organization_id = :'org2'), 0, 'STAFF: 타 조직 비공개 상품 차단');
select tests.fails(format($$insert into b2b_accounts(organization_id, name) values (%L, 'x')$$, :'org'), 'STAFF: B2B 입력 차단');
select tests.fails(format($$insert into products(organization_id, sku, name, category) values (%L, 'S9', 'x', '크림')$$, :'org'), 'STAFF: 상품 등록 차단');
select tests.eq(tests.affected($$update products set price = 1 where sku = 'SKU-1'$$), 0, 'STAFF: 상품 수정 0행');
select tests.eq(tests.affected(format($$insert into sales_records(organization_id, product_id, channel_id, sale_date, units) values (%L, '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 1)$$, :'org')), 1, 'STAFF: 판매 입력');
select tests.eq(tests.affected($$update inventory set current_stock = 90$$), 1, 'STAFF: 재고 수정');
select tests.fails(format($$insert into growth_actions(organization_id, rule_key, category, priority, title, judgement, recommendation, status) values (%L, 'r:x', '재고', '높음', 't', 'j', 'r', 'DONE')$$, :'org'), 'STAFF: DONE 상태 Action 직접 생성 차단');
insert into growth_actions(id, organization_id, rule_key, category, priority, title, judgement, recommendation)
  values ('30000000-0000-0000-0000-000000000001', :'org', 'stock:1', '재고', '높음', '재고 위험', '근거', '추천');
select tests.fails(format($$insert into growth_actions(organization_id, rule_key, category, priority, title, judgement, recommendation) values (%L, 'stock:1', '재고', '높음', 't', 'j', 'r')$$, :'org'), '같은 rule의 열린 Action 중복 차단');
select tests.eq(tests.affected($$update growth_actions set status = 'REVIEWED' where id = '30000000-0000-0000-0000-000000000001'$$), 1, 'STAFF: NEW→REVIEWED');
select tests.fails($$update growth_actions set status = 'IN_PROGRESS' where id = '30000000-0000-0000-0000-000000000001'$$, 'STAFF: 승인(→IN_PROGRESS) 차단');
select tests.fails($$update growth_actions set status = 'DISMISSED' where id = '30000000-0000-0000-0000-000000000001'$$, 'STAFF: 보류(→DISMISSED) 차단');
select tests.eq(tests.affected(format($$insert into proof_events(id, organization_id, event_type, trigger, decision, decision_method, data_source) values ('40000000-0000-0000-0000-000000000001', %L, 'MANUAL', 't', 'd', 'HUMAN', 'MANUAL')$$, :'org')), 1, 'STAFF: Proof 기록(RECORDED)');
select tests.fails(format($$insert into proof_events(organization_id, event_type, trigger, decision, decision_method, data_source, status) values (%L, 'MANUAL', 't', 'd', 'HUMAN', 'MANUAL', 'RESULT_CONFIRMED')$$, :'org'), 'STAFF: 확정 상태 Proof 직접 생성 차단');
select tests.eq(tests.affected($$update proof_events set status = 'RESULT_CONFIRMED'$$), 0, 'STAFF: Proof 확정 0행');
select tests.fails(format($$select lock_baseline(%L, 'COST', 3, '시간', null, null, 'm', 'SELF_REPORT', null, 'staff')$$, :'org'), 'STAFF: Baseline Lock 차단');
select tests.eq(tests.affected(format($$update organizations set ax_owner_name = 'x' where id = %L$$, :'org')), 0, 'STAFF: 조직 설정 수정 0행');
select tests.fails(format($$insert into organization_members(organization_id, user_id, role) values (%L, '00000000-0000-0000-0000-000000000004', 'OWNER')$$, :'org'), 'STAFF: 구성원 추가 차단');
select tests.fails(format($$insert into tech_assets(organization_id, kind) values (%L, '특허')$$, :'org'), 'STAFF: 기술자산 수정 차단');
commit;

-- ============ ADMIN ============
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select tests.eq((select count(*) from b2b_accounts), 1, 'ADMIN: B2B 조회');
select tests.eq((select count(*) from customer_profiles), 1, 'ADMIN: 고객 프로필 조회');
select tests.eq(tests.affected($$update growth_actions set status = 'IN_PROGRESS', approved_by = 'admin' where id = '30000000-0000-0000-0000-000000000001'$$), 1, 'ADMIN: 승인 REVIEWED→IN_PROGRESS');
select tests.eq(tests.affected($$update proof_events set status = 'RESULT_CONFIRMED'$$), 0, 'ADMIN: Proof 확정 0행 (OWNER 전용)');
select tests.fails(format($$select lock_baseline(%L, 'COST', 3, '시간', null, null, 'm', 'SELF_REPORT', null, 'admin')$$, :'org'), 'ADMIN: Baseline Lock 차단');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq(tests.affected($$update growth_actions set status = 'DONE', result_note = '대응 완료' where id = '30000000-0000-0000-0000-000000000001'$$), 1, 'STAFF: 실행 IN_PROGRESS→DONE');
select tests.fails($$update growth_actions set status = 'NEW' where id = '30000000-0000-0000-0000-000000000001'$$, 'DONE→NEW 역전이 차단');
select tests.eq(tests.affected(format($$insert into growth_actions(organization_id, rule_key, category, priority, title, judgement, recommendation) values (%L, 'stock:1', '재고', '높음', 't', 'j', 'r')$$, :'org')), 1, 'DONE 이후 같은 rule 재발생 허용');
commit;

-- ============ OWNER: 확정 / Baseline / 설정 ============
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq(tests.affected($$update proof_events set status = 'RESULT_CONFIRMED', result_confirmed_at = now() where id = '40000000-0000-0000-0000-000000000001'$$), 1, 'OWNER: Proof 확정');
select lock_baseline(:'org', 'COST', 3.5, '시간', current_date - 14, current_date, '담당자 자기기록', 'SELF_REPORT', null, 'owner');
select lock_baseline(:'org', 'COST', 4, '시간', current_date - 14, current_date, '재측정', 'SELF_REPORT', '수정', 'owner');
select tests.eq((select count(*) from kpi_baselines where kpi_key = 'COST'), 2, 'OWNER: Baseline 이력 보존 (2행)');
select tests.eq((select count(*) from kpi_baselines where kpi_key = 'COST' and superseded_at is null), 1, 'OWNER: 활성 Baseline 1개');
select tests.eq(tests.affected(format($$update organizations set ax_owner_name = '담당 A', pilot_started_on = current_date where id = %L$$, :'org')), 1, 'OWNER: AX OWNER·Pilot 시작일 저장');
select tests.eq(tests.affected(format($$insert into tech_assets(organization_id, kind) values (%L, '실증자료')$$, :'org')), 1, 'OWNER: 기술자산 수정');
commit;

-- ============ 타 조직 사용자 ============
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select tests.eq((select count(*) from products where organization_id = :'org'), 1, 'OUTSIDER: 공개 상품만 조회');
select tests.eq((select count(*) from sales_records), 0, 'OUTSIDER: 타 조직 판매 차단');
select tests.eq((select count(*) from growth_actions), 0, 'OUTSIDER: 타 조직 Action 차단');
select tests.eq((select count(*) from kpi_baselines), 0, 'OUTSIDER: 타 조직 Baseline 차단');
select tests.eq(tests.affected(format($$update organizations set name = 'hack' where id = %L$$, :'org')), 0, 'OUTSIDER: 타 조직 수정 0행');
commit;

-- ============ 익명 고객 (anon) ============
begin;
set local role anon;
select tests.eq((select count(*) from products), 1, 'ANON: 공개 상품 1개만 조회');
select tests.eq((select count(*) from organizations), 0, 'ANON: 조직 조회 차단');
select tests.eq(tests.affected(format($$insert into customer_events(organization_id, session_id, event_type, product_id) values (%L, 'sess-test-01', 'view_product', '20000000-0000-0000-0000-000000000001')$$, :'org')), 1, 'ANON: 고객 이벤트 기록');
select tests.eq(tests.affected(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'sess-test-01', 'finder_start')$$, :'org')), 1, 'ANON: 상품 없는 이벤트 기록');
select tests.fails(format($$insert into customer_events(organization_id, session_id, event_type, product_id) values (%L, 'sess-test-01', 'view_product', '20000000-0000-0000-0000-000000000009')$$, :'org'), 'ANON: 타 조직 상품 id 이벤트 차단');
select tests.fails($$insert into customer_events(organization_id, session_id, event_type) values ('99999999-0000-0000-0000-000000000000', 'sess-test-01', 'finder_start')$$, 'ANON: 없는 조직 이벤트 차단');
select tests.fails(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'sess-test-01', 'hack')$$, :'org'), 'ANON: 정의되지 않은 이벤트 유형 차단');
select tests.eq((select count(*) from customer_events), 0, 'ANON: 이벤트 조회 차단');
select tests.eq(tests.affected(format($$insert into beauty_profiles(organization_id, session_id) values (%L, 'sess-test-01')$$, :'org')), 1, 'ANON: Beauty 프로필 기록');
select tests.eq(tests.affected(format($$insert into beauty_recommendations(organization_id, session_id) values (%L, 'sess-test-01')$$, :'org')), 1, 'ANON: 추천 결과 기록');
select tests.fails(format($$insert into sales_records(organization_id, product_id, channel_id, sale_date, units) values (%L, '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 1)$$, :'org'), 'ANON: 판매 입력 차단');
commit;

-- 구성원은 고객 이벤트 조회 가능
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq((select count(*) from customer_events), 2, 'STAFF: 고객 이벤트 조회');
commit;

-- Realtime publication
select tests.eq((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('customer_events', 'growth_actions')), 2, 'Realtime: customer_events·growth_actions 등록');

\echo 'ALL RLS TESTS PASSED'
