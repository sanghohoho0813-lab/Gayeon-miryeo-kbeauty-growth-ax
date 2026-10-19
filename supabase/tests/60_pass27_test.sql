-- 010 채널별 판매 입력 주기 검증 (10~50 이후 실행, 같은 조직 사용)
\set ON_ERROR_STOP 1
select id as org from organizations where name = '가연 Test Org' \gset

-- 기존 채널은 'daily' (지금과 같은 계산)
select tests.eq((select count(*) from channels where input_cycle <> 'daily')::int, 0, '기존 채널 기본값 daily');

-- OWNER: 주기 저장 · 허용 값만
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq(tests.affected($$update channels set input_cycle = 'monthly' where id = '10000000-0000-0000-0000-000000000001'$$), 1, 'OWNER: 월 1회 입력으로 저장');
select tests.eq(tests.affected($$update channels set input_cycle = 'weekly' where id = '10000000-0000-0000-0000-000000000001'$$), 1, 'OWNER: 주 1회 입력으로 저장');
select tests.fails($$update channels set input_cycle = 'yearly' where id = '10000000-0000-0000-0000-000000000001'$$, '정해지지 않은 주기 차단');
select tests.fails($$update channels set input_cycle = null where id = '10000000-0000-0000-0000-000000000001'$$, '빈 주기 차단 (not null)');
select tests.eq(tests.affected(format($$insert into channels(organization_id, name, type) values (%L, '새 채널', '온라인몰')$$, :'org')), 1, 'OWNER: 주기 없이 새 채널 → 기본값');
select tests.eq((select (input_cycle = 'daily')::int from channels where name = '새 채널'), 1, '새 채널 기본 daily');
commit;

-- ADMIN: 채널 관리 권한 그대로 (수정 가능)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select tests.eq(tests.affected($$update channels set input_cycle = 'monthly' where id = '10000000-0000-0000-0000-000000000001'$$), 1, 'ADMIN: 입력 주기 수정 (채널 관리 권한)');
commit;

-- STAFF: 수정 불가 · 조회 가능 (계산에 필요)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq(tests.affected($$update channels set input_cycle = 'daily' where id = '10000000-0000-0000-0000-000000000001'$$), 0, 'STAFF: 입력 주기 수정 차단');
select tests.eq((select (input_cycle = 'monthly')::int from channels where id = '10000000-0000-0000-0000-000000000001'), 1, 'STAFF: 입력 주기 조회 (값 그대로)');
commit;

-- 익명: 조회 차단
begin;
set local role anon;
select tests.eq((select count(*) from channels where input_cycle is not null)::int, 0, '익명: 채널 조회 차단');
commit;
