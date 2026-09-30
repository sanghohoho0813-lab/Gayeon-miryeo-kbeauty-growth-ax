-- 006 익명 이벤트 보호 검증 (10_rls_test.sql 이후 실행 — 같은 조직 사용)
\set ON_ERROR_STOP 1
select id as org from organizations where name = '가연 Test Org' \gset

begin;
set local role anon;
select tests.eq((select sum(tests.affected(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'sess-rate-01', 'finder_start')$$, :'org')) + g * 0)::bigint from generate_series(1, 60) g), 60, 'ANON: 세션당 분당 60건까지 기록');
select tests.fails(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'sess-rate-01', 'finder_start')$$, :'org'), 'ANON: 61번째 이벤트 차단 (세션 한도)');
select tests.eq(tests.affected(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'sess-rate-02', 'finder_start')$$, :'org')), 1, 'ANON: 다른 세션은 기록 가능');
select tests.fails(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'short', 'finder_start')$$, :'org'), 'ANON: 비정상 session_id 차단');
select tests.fails(format($$insert into customer_events(organization_id, session_id, event_type, payload) values (%L, 'sess-rate-03', 'finder_start', jsonb_build_object('x', repeat('a', 5000)))$$, :'org'), 'ANON: 과대 payload 차단');
select tests.eq(tests.affected(format($$insert into customer_events(organization_id, session_id, event_type, created_at) values (%L, 'sess-rate-04', 'finder_start', now() - interval '30 days')$$, :'org')), 1, 'ANON: 과거 시각 지정 insert');
commit;
select tests.eq((select count(*) from customer_events where session_id = 'sess-rate-04' and created_at > now() - interval '1 minute'), 1, '과거 시각 → 서버 시각으로 강제');

begin;
set local role anon;
select tests.eq((select sum(tests.affected(format($$insert into beauty_profiles(organization_id, session_id) values (%L, 'sess-beauty-01')$$, :'org')) + g * 0)::bigint from generate_series(1, 20) g), 20, 'ANON: Finder 결과 시간당 20건까지');
select tests.fails(format($$insert into beauty_profiles(organization_id, session_id) values (%L, 'sess-beauty-01')$$, :'org'), 'ANON: 21번째 결과 저장 차단');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq((select sum(tests.affected(format($$insert into customer_events(organization_id, session_id, event_type) values (%L, 'sess-staff-01', 'finder_start')$$, :'org')) + g * 0)::bigint from generate_series(1, 70) g), 70, '구성원(로그인) 입력은 한도 미적용');
commit;
\echo 'ALL EVENT GUARD TESTS PASSED'
