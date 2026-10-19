-- 011 파일 가져오기 기록·되돌리기 검증 (10~60 이후 실행, 같은 조직 사용)
\set ON_ERROR_STOP 1
select id as org from organizations where name = '가연 Test Org' \gset

-- OWNER: 판매 파일 기록 + 행 2개(기록 연결) + 행 1개(직접 입력)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq(tests.affected(format($$insert into import_batches(id, organization_id, kind, file_name, row_count, created_by_email) values ('a0000000-0000-0000-0000-000000000001', %L, 'sales', 'sales_week1.csv', 2, 'spoof@x')$$, :'org')), 1, 'OWNER: 판매 파일 기록');
select tests.eq((select (created_by_email = 'owner@test.local')::int from import_batches where id = 'a0000000-0000-0000-0000-000000000001'), 1, '기록자는 로그인 계정 (위장 불가)');
select tests.eq(tests.affected(format($$insert into sales_records(organization_id, product_id, channel_id, sale_date, units, revenue, source, import_batch_id) values (%L, '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date - 2, 3, 30000, 'csv', 'a0000000-0000-0000-0000-000000000001'), (%L, '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date - 1, 4, 40000, 'csv', 'a0000000-0000-0000-0000-000000000001')$$, :'org', :'org')), 2, '파일 판매 2행 (기록 연결)');
select tests.eq(tests.affected(format($$insert into sales_records(organization_id, product_id, channel_id, sale_date, units, revenue, source) values (%L, '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date - 1, 9, 90000, 'manual')$$, :'org')), 1, '직접 입력 1행 (기록 없음)');
select tests.fails(format($$insert into import_batches(organization_id, kind) values (%L, 'products')$$, :'org'), '정해지지 않은 종류 차단 (판매·정산만)');
select tests.fails($$update import_batches set file_name = 'x.csv' where id = 'a0000000-0000-0000-0000-000000000001'$$, '기록 내용 수정 차단 (되돌림 표시만)');
select tests.eq(tests.affected(format($$insert into import_batches(id, organization_id, kind, file_name, row_count) values ('a0000000-0000-0000-0000-000000000002', %L, 'settlements', 'settle.csv', 1)$$, :'org')), 1, 'OWNER: 정산 파일 기록');
select tests.eq(tests.affected(format($$insert into settlements(organization_id, kind, counterparty, amount, issued_on, import_batch_id) values (%L, 'B2B', '파일 거래처', 1000000, current_date - 5, 'a0000000-0000-0000-0000-000000000002')$$, :'org')), 1, '파일 정산 1건 (기록 연결)');
commit;

-- STAFF: 판매 기록 조회·생성 가능, 정산 기록은 안 보이고 못 만듦, 되돌리기 불가
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq((select count(*) from import_batches where kind = 'sales'), 1, 'STAFF: 판매 파일 기록 조회');
select tests.eq((select count(*) from import_batches where kind = 'settlements'), 0, 'STAFF: 정산 파일 기록 안 보임');
select tests.eq(tests.affected(format($$insert into import_batches(organization_id, kind, file_name, row_count) values (%L, 'sales', 'staff.csv', 0)$$, :'org')), 1, 'STAFF: 판매 파일 기록 생성 (판매 입력 권한)');
select tests.fails(format($$insert into import_batches(organization_id, kind, file_name) values (%L, 'settlements', 'x.csv')$$, :'org'), 'STAFF: 정산 파일 기록 생성 차단');
select tests.fails($$select public.undo_import('a0000000-0000-0000-0000-000000000001')$$, 'STAFF: 되돌리기 차단');
select tests.eq(tests.affected($$update import_batches set undone_at = now() where id = 'a0000000-0000-0000-0000-000000000001'$$), 0, 'STAFF: 되돌림 표시 직접 수정 차단');
commit;

-- ADMIN: 판매 파일 되돌리기 → 그 파일 2행만 삭제, 직접 입력 행은 그대로, 두 번째는 차단
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select tests.eq((select (public.undo_import('a0000000-0000-0000-0000-000000000001') ->> 'sales')::int), 2, 'ADMIN: 되돌리기 → 판매 2행 삭제');
select tests.eq((select count(*) from sales_records where import_batch_id = 'a0000000-0000-0000-0000-000000000001'), 0, '파일 판매 행 없음');
select tests.eq((select count(*) from sales_records where source = 'manual' and units = 9), 1, '직접 입력 행은 그대로');
select tests.eq((select (undone_at is not null and undone_by_email = 'admin@test.local')::int from import_batches where id = 'a0000000-0000-0000-0000-000000000001'), 1, '기록에 되돌림 시각·계정');
select tests.fails($$select public.undo_import('a0000000-0000-0000-0000-000000000001')$$, '이미 되돌린 파일 다시 되돌리기 차단');
commit;

-- OWNER: 정산 파일 되돌리기
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq((select (public.undo_import('a0000000-0000-0000-0000-000000000002') ->> 'settlements')::int), 1, 'OWNER: 정산 파일 되돌리기 → 1건 삭제');
select tests.eq((select count(*) from settlements where counterparty = '파일 거래처'), 0, '파일 정산 없음');
commit;

-- 익명: 기록 조회·되돌리기 불가
begin;
set local role anon;
select tests.eq((select count(*) from import_batches), 0, '익명: 기록 조회 차단');
select tests.fails($$select public.undo_import('a0000000-0000-0000-0000-000000000002')$$, '익명: 되돌리기 차단');
commit;
