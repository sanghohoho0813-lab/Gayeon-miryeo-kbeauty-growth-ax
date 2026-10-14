-- 009 운영 기준값 검증 (10·20·30·40 이후 실행, 같은 조직 사용)
\set ON_ERROR_STOP 1
select id as org from organizations where name = '가연 Test Org' \gset

-- OWNER: 저장·범위 검사
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select tests.eq(tests.affected(format($$update organizations set planning = '{"safetyDays": 21, "coverDays": 60, "roundTo": 100, "outcomeDays": 28}' where id = %L$$, :'org')), 1, 'OWNER: 운영 기준값 저장');
select tests.eq((select (planning ->> 'safetyDays')::int from organizations where id = :'org'), 21, '저장값 반영 (안전 21일)');
select tests.eq(tests.affected(format($$update organizations set planning = '{"roundTo": 20}' where id = %L$$, :'org')), 1, 'OWNER: 일부 항목만 (나머지 기본값)');
select tests.eq(tests.affected(format($$update organizations set planning = null where id = %L$$, :'org')), 1, 'OWNER: 기본값으로 (null)');
select tests.fails(format($$update organizations set planning = '{"safetyDays": 61}' where id = %L$$, :'org'), '안전일수 61일 차단 (0~60)');
select tests.fails(format($$update organizations set planning = '{"safetyDays": -1}' where id = %L$$, :'org'), '안전일수 음수 차단');
select tests.fails(format($$update organizations set planning = '{"coverDays": 6}' where id = %L$$, :'org'), '입고 후 일수 6일 차단 (7~180)');
select tests.fails(format($$update organizations set planning = '{"roundTo": 0}' where id = %L$$, :'org'), '생산 단위 0 차단 (1~1000)');
select tests.fails(format($$update organizations set planning = '{"roundTo": 12.5}' where id = %L$$, :'org'), '소수 차단 (정수만)');
select tests.fails(format($$update organizations set planning = '{"outcomeDays": 10}' where id = %L$$, :'org'), '사후 성과 10일 차단 (7·14·28만)');
select tests.fails(format($$update organizations set planning = '{"safetyDays": "14"}' where id = %L$$, :'org'), '문자열 값 차단');
select tests.fails(format($$update organizations set planning = '{"foo": 1}' where id = %L$$, :'org'), '모르는 키 차단');
select tests.fails(format($$update organizations set planning = '[14]' where id = %L$$, :'org'), '객체가 아닌 값 차단');
commit;

-- ADMIN·STAFF: 수정 불가 (org_update = OWNER), 조회는 가능 (계산에 필요)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select tests.eq(tests.affected(format($$update organizations set planning = '{"safetyDays": 7}' where id = %L$$, :'org')), 0, 'ADMIN: 운영 기준값 수정 차단');
select tests.eq((select count(*) from organizations where id = :'org'), 1, 'ADMIN: 조직(기준값) 조회');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq(tests.affected(format($$update organizations set planning = '{"safetyDays": 7}' where id = %L$$, :'org')), 0, 'STAFF: 운영 기준값 수정 차단');
commit;
begin;
set local role anon;
select tests.eq((select count(*) from organizations), 0, '익명: 조직 조회 차단');
commit;
select tests.eq((select planning is null from organizations where id = :'org')::int, 1, '권한 없는 수정 시도 후에도 값 그대로 (기본값)');
