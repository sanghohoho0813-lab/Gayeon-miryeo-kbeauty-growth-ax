-- 007 고객 회원·구매이력·정산 검증 (10·20 이후 실행, 같은 조직 사용)
\set ON_ERROR_STOP 1
select id as org from organizations where name = '가연 Test Org' \gset
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000005', 'customer1@test.local'),
  ('00000000-0000-0000-0000-000000000006', 'customer2@test.local');

-- 익명 상태로 저장한 추천 결과 (가입 전)
begin;
set local role anon;
insert into beauty_recommendations(organization_id, session_id) values (:'org', 'sess-claim-0001');
commit;

-- 고객 1: 가입
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
select tests.eq(tests.affected(format($$insert into customer_accounts(user_id, organization_id, display_name, privacy_agreed_at, privacy_version) values (auth.uid(), %L, '고객1', now(), 'v-test')$$, :'org')), 1, 'CUSTOMER: 계정 생성');
select tests.eq((select count(*) from customer_accounts where email = 'customer1@test.local'), 1, 'CUSTOMER: 이메일 자동 채움 (auth.users)');
select tests.eq((select claim_session('sess-claim-0001'))::bigint, 1, 'CUSTOMER: 가입 전 익명 추천 기록 가져오기');
select tests.eq((select count(*) from beauty_recommendations), 1, 'CUSTOMER: 내 추천 기록만 조회');
select tests.eq(tests.affected(format($$insert into beauty_recommendations(organization_id, session_id, customer_user_id) values (%L, 'sess-cust-0001', auth.uid())$$, :'org')), 1, 'CUSTOMER: 계정에 연결된 추천 저장');
select tests.fails(format($$insert into beauty_recommendations(organization_id, session_id, customer_user_id) values (%L, 'sess-cust-0001', '00000000-0000-0000-0000-000000000006')$$, :'org'), 'CUSTOMER: 남의 계정으로 추천 저장 차단');
select tests.eq(tests.affected(format($$insert into customer_purchases(id, organization_id, customer_user_id, product_id, purchased_on, source) values ('50000000-0000-0000-0000-000000000001', %L, auth.uid(), '20000000-0000-0000-0000-000000000001', current_date - 20, 'SELF')$$, :'org')), 1, 'CUSTOMER: 구매 자기기록');
select tests.fails(format($$insert into customer_purchases(organization_id, customer_user_id, product_id, purchased_on, source) values (%L, auth.uid(), '20000000-0000-0000-0000-000000000001', current_date, 'STAFF')$$, :'org'), 'CUSTOMER: 운영자 기록(STAFF) 위장 차단');
select tests.fails(format($$insert into customer_purchases(organization_id, customer_user_id, product_id, purchased_on, source) values (%L, '00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', current_date, 'SELF')$$, :'org'), 'CUSTOMER: 남의 구매기록 생성 차단');
select tests.fails(format($$insert into customer_purchases(organization_id, customer_user_id, product_id, purchased_on, source) values (%L, auth.uid(), '20000000-0000-0000-0000-000000000009', current_date, 'SELF')$$, :'org'), 'CUSTOMER: 타 조직 상품 구매기록 차단');
select tests.fails($$select bootstrap_organization('고객이 만든 조직')$$, 'CUSTOMER: 운영 조직 생성 차단');
select tests.eq((select count(*) from organization_members), 0, 'CUSTOMER: 구성원 정보 조회 불가');
select tests.eq((select count(*) from settlements), 0, 'CUSTOMER: 정산 조회 불가');
commit;

-- 고객 2: 고객 1의 정보 접근 불가
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
insert into customer_accounts(user_id, organization_id, privacy_agreed_at, privacy_version) values (auth.uid(), :'org', now(), 'v-test');
select tests.eq((select count(*) from customer_accounts), 1, 'CUSTOMER2: 자기 계정만 조회');
select tests.eq((select count(*) from customer_purchases), 0, 'CUSTOMER2: 남의 구매기록 조회 불가');
select tests.eq((select count(*) from beauty_recommendations), 0, 'CUSTOMER2: 남의 추천 기록 조회 불가');
select tests.eq(tests.affected($$delete from customer_purchases$$), 0, 'CUSTOMER2: 남의 구매기록 삭제 0행');
commit;

-- 직원(STAFF)은 고객 계정·정산 조회 불가, 고객 계정 생성 불가
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select tests.eq((select count(*) from customer_accounts), 0, 'STAFF: 고객 개인정보 조회 차단');
select tests.eq((select count(*) from customer_purchases), 0, 'STAFF: 고객 구매이력 조회 차단');
select tests.fails(format($$insert into customer_accounts(user_id, organization_id, privacy_agreed_at, privacy_version) values (auth.uid(), %L, now(), 'v')$$, :'org'), 'STAFF: 운영자 계정으로 고객 가입 차단');
select tests.eq((select count(*) from settlements), 0, 'STAFF: 정산 조회 차단');
select tests.fails(format($$insert into settlements(organization_id, kind, counterparty, amount, issued_on) values (%L, 'B2B', 'x', 1, current_date)$$, :'org'), 'STAFF: 정산 입력 차단');
commit;

-- 관리자(ADMIN): 고객 조회·운영자 구매기록·정산
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select tests.eq((select count(*) from customer_accounts where organization_id = :'org'), 2, 'ADMIN: 고객 계정 조회');
select tests.eq(tests.affected(format($$insert into customer_purchases(organization_id, customer_user_id, product_id, purchased_on, quantity, source) values (%L, '00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', current_date - 3, 2, 'STAFF')$$, :'org')), 1, 'ADMIN: 고객 구매 기록 입력 (STAFF)');
select tests.fails(format($$insert into customer_purchases(organization_id, customer_user_id, product_id, purchased_on, source) values (%L, '00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', current_date, 'STAFF')$$, :'org'), 'ADMIN: 고객 계정 없는 사용자 구매기록 차단');
select tests.eq(tests.affected(format($$insert into settlements(id, organization_id, kind, counterparty, amount, issued_on, due_on) values ('60000000-0000-0000-0000-000000000001', %L, 'B2B', '거래처 A', 1000000, current_date - 40, current_date - 10)$$, :'org')), 1, 'ADMIN: 정산(미수금) 입력');
select tests.fails($$update settlements set paid_amount = 2000000 where id = '60000000-0000-0000-0000-000000000001'$$, '입금액 > 청구액 차단');
select tests.eq(tests.affected($$update settlements set paid_amount = 400000, status = 'PARTIAL' where id = '60000000-0000-0000-0000-000000000001'$$), 1, 'ADMIN: 부분 입금 기록');
commit;

-- 고객 1: 자기 구매기록 삭제, 계정 삭제
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
select tests.eq(tests.affected($$delete from customer_purchases where id = '50000000-0000-0000-0000-000000000001'$$), 1, 'CUSTOMER: 내 구매 자기기록 삭제');
select tests.eq(tests.affected($$delete from customer_accounts$$), 1, 'CUSTOMER: 내 계정 정보 삭제 (탈퇴)');
commit;

begin;
set local role anon;
select tests.eq((select count(*) from customer_accounts), 0, 'ANON: 고객 계정 조회 불가');
select tests.eq((select count(*) from customer_purchases), 0, 'ANON: 구매이력 조회 불가');
commit;
\echo 'ALL STAGE2 TESTS PASSED'
