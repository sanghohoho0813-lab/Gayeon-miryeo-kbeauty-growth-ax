-- 008 OEM 생산기간·MOQ / 월 매출 목표 검증 (10·20·30 이후 실행, 같은 조직 사용)
\set ON_ERROR_STOP 1
select id as org from organizations where name = '가연 Test Org' \gset

-- OWNER
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq(tests.affected($$update products set lead_time_days = 30, moq = 500 where id = '20000000-0000-0000-0000-000000000001'$$), 1, 'OWNER: 생산기간·MOQ 저장');
select tests.fails($$update products set lead_time_days = 0 where id = '20000000-0000-0000-0000-000000000001'$$, '생산기간 0일 차단 (1~365)');
select tests.fails($$update products set lead_time_days = 400 where id = '20000000-0000-0000-0000-000000000001'$$, '생산기간 400일 차단');
select tests.fails($$update products set moq = -1 where id = '20000000-0000-0000-0000-000000000001'$$, 'MOQ 음수 차단');
select tests.eq(tests.affected(format($$insert into monthly_targets(organization_id, month, revenue_target, note, set_by) values (%L, '2026-10', 120000000, '10월 목표', 'spoof@x')$$, :'org')), 1, 'OWNER: 월 목표 입력');
select tests.eq((select count(*) from monthly_targets where set_by = 'owner@test.local'), 1, '입력자는 로그인 계정으로 기록 (위장 불가)');
select tests.fails(format($$insert into monthly_targets(organization_id, month, revenue_target) values (%L, '2026-13', 1)$$, :'org'), '잘못된 월(13월) 차단');
select tests.fails(format($$insert into monthly_targets(organization_id, month, revenue_target) values (%L, '2026-11', 0)$$, :'org'), '목표 0원 차단');
select tests.eq(tests.affected(format($$insert into monthly_targets(organization_id, month, revenue_target) values (%L, '2026-10', 130000000) on conflict (organization_id, month) do update set revenue_target = excluded.revenue_target$$, :'org')), 1, 'OWNER: 같은 달 목표 수정 (upsert)');
select tests.eq((select revenue_target::bigint from monthly_targets where month = '2026-10'), 130000000, '수정값 반영');
commit;

-- ADMIN: 조회만
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select tests.eq((select count(*) from monthly_targets), 1, 'ADMIN: 월 목표 조회');
select tests.fails(format($$insert into monthly_targets(organization_id, month, revenue_target) values (%L, '2026-11', 1000)$$, :'org'), 'ADMIN: 월 목표 입력 차단');
select tests.eq(tests.affected($$update monthly_targets set revenue_target = 1 where month = '2026-10'$$), 0, 'ADMIN: 월 목표 수정 차단');
select tests.eq(tests.affected($$update products set lead_time_days = 45 where id = '20000000-0000-0000-0000-000000000001'$$), 1, 'ADMIN: 생산기간 수정 (상품 관리 권한)');
commit;

-- STAFF·외부인·익명: 목표 안 보임
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq((select count(*) from monthly_targets), 0, 'STAFF: 월 목표 조회 차단');
select tests.fails(format($$insert into monthly_targets(organization_id, month, revenue_target) values (%L, '2026-12', 1000)$$, :'org'), 'STAFF: 월 목표 입력 차단');
select tests.eq(tests.affected($$update products set lead_time_days = 10 where id = '20000000-0000-0000-0000-000000000001'$$), 0, 'STAFF: 생산기간 수정 차단');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select tests.eq((select count(*) from monthly_targets), 0, 'OUTSIDER: 월 목표 조회 차단');
commit;
begin;
set local role anon;
select tests.eq((select count(*) from monthly_targets), 0, 'ANON: 월 목표 조회 차단');
commit;
-- OWNER 삭제
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq(tests.affected($$delete from monthly_targets where month = '2026-10'$$), 1, 'OWNER: 월 목표 삭제');
commit;
\echo 'ALL PASS10 TESTS PASSED'
