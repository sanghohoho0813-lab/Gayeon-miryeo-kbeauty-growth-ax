# DECISIONS

형식: DECISION / WHY / WHY NOT ALTERNATIVE / REVISIT WHEN

## D-001 Data Mode를 명시적 환경변수로 분리
- DECISION: `NEXT_PUBLIC_DATA_MODE=demo|live`. Live는 Supabase만 사용, 실패 시 Error/Empty.
- WHY: 기존 "Supabase 있으면 자동 Live, 없으면 Demo fallback"은 Live인데 Demo 숫자를 보여줄 위험 (Strategic P0).
- WHY NOT: 자동 감지 — 설정 실수가 조용히 가짜 숫자로 이어짐.
- REVISIT WHEN: Production 전환 시 demo 코드 경로 번들 제외 검토.

## D-002 Demo 저장소 = localStorage 단일 JSON DB
- DECISION: Demo 모드 쓰기(이벤트·Action·Proof·마스터 수정)는 `miryeo-demo-db-v2`에 저장.
- WHY: 서버 없이도 Closed Loop 실제 동작 + PC/Mobile iframe 간 `storage` 이벤트로 즉시 동기화 (Same Data).
- WHY NOT: 인메모리 — 새로고침·iframe 간 불일치.
- REVISIT WHEN: Live 전환 완료 후 Demo는 시연 전용으로 유지.

## D-003 Sales를 행(row) 구조로 정상화
- DECISION: `sales_records(sale_date, units, revenue)`; 8주 주간 배열은 Adapter에서 생성.
- WHY: weeklyUnits 배열은 실제 CSV/DB 입력과 맞지 않음.
- REVISIT WHEN: 일 단위 → 주문 단위 필요 시 orders 테이블 추가.

## D-004 매출 KPI는 달력 월이 아닌 "최근 4주 vs 이전 4주"
- WHY: 월초 과소표시 왜곡 방지, 하드코딩 날짜 제거.

## D-005 Role = OWNER / ADMIN / STAFF, Organization 기반 RLS
- WHY: 대표·직원 같은 앱에서 권한만 분리. SaaS 전체 기능은 만들지 않음 (단일 조직 운영 + 멀티테넌트 대비 구조만).
- Demo는 Role Switcher, Live는 `organization_members.role`.

## D-006 고객 이벤트는 익명 session_id, 개인정보 미수집
- WHY: Primary Conversion 측정에 개인정보 불필요. Live insert는 anon RLS로 `customer_events`에만 허용.
- REVISIT WHEN: 고객 로그인(CONDITIONAL) 도입 시 session ↔ customer 연결.

## D-007 Growth Action은 RULE 생성 + HUMAN 승인 (L2~L3)
- WHY: 오류비용 MID, 자동실행(L4) 금지. 추천 → 승인 → 실행 → 결과 → Proof.
- AX→Customer 효과(고객 화면 노출)도 사람이 실행 시 선택해야만 반영.

## D-008 AX Coach는 Growth Center "오늘의 Mission"으로 통합
- WHY: Sidebar 1차 메뉴 증가 억제 (v4.1 Navigation Density).

## D-009 Canonical 7 Theme, legacy ID 자동 migration
- burgundy-slate / plum-indigo → deep-navy, steel-platinum → pure-white.

## D-010 Device View = 동일 앱 iframe(`?frame=mobile`) + postMessage Route Sync
- WHY: 별도 mobile-preview route/mock 금지(v4.1). localStorage 공유로 Theme·Role·Demo DB 동일.
- Dual에서 PC 영역은 Container Query로 반응 (window 폭이 아닌 실제 영역 폭).

## D-011 NOT BUILDING: PG, 외부 쇼핑몰 실API, OMS/WMS, Native, CRM, 다국어, Vision 진단, 모델학습, L4, Agent
- WHY: Pilot 목표는 "실데이터 입력 + Closed Loop + Evidence". 위 항목은 실사용 데이터로 필요성이 검증된 뒤 2차.
- REVISIT WHEN: 2차 고도화 체크리스트에서 요구 확인 시.

## D-012 LLM 미연결 (CONDITIONAL)
- WHY: 현재 판단은 모두 RULE로 설명 가능. API Key 없음. AI Ready Marker로 연결 위치만 표시.
- REVISIT WHEN: 대표용 경영요약 필요 + API 사용 승인.

## D-013 Presentation Mode 보류 (PLUS)
- WHY: CORE 우선. RECOMMENDATIONS.md에 기록.

## D-014 Baseline은 덮어쓰지 않고 이력으로 보존 (PASS 2)
- WHY: 증빙 신뢰성. 기준값을 사후에 바꾸면 효과 주장이 무효. 재잠금은 OWNER + 사유 필수, 이전 행은 superseded.
- `lock_baseline()` RPC(security invoker)로 superseded + insert를 한 트랜잭션에서 처리.

## D-015 Growth Action 상태 전이·승인 권한을 DB에서도 강제 (PASS 2)
- WHY: 앱 버튼 숨김만으로는 API 직접 호출을 막지 못함. `guard_action_update` 트리거: 허용 전이만, 승인/보류는 OWNER·ADMIN.
- Action 생성은 NEW만, Proof 직접 생성은 RECORDED만 (확정은 OWNER update).

## D-016 SCALE KPI를 시스템 측정 가능한 "주당 완료 Action"으로 확정
- WHY: 기존 정의(AX 경유 처리 비율)는 분모가 자기기록이라 자동 측정 불가. 시스템 지표를 주 KPI로, 비율은 보조 자기기록으로.
- REVISIT WHEN: 고객이 다른 SCALE 지표를 지정할 때.

## D-017 판매 파일 가져오기 = 열 자동 인식 + 사용자 확인 (CSV/XLSX)
- WHY: 실제 쇼핑몰·자체 집계 파일은 열 이름이 제각각. 별칭 자동 매핑 후 사람이 확인·수정. EUC-KR CSV 자동 재해석.
- 중복 의심 행(같은 날짜·상품·채널·수량·매출)은 기본 제외, 사용자가 명시적으로 포함 가능.
- 라이브러리: read-excel-file(MIT, 동적 import). 구형 .xls는 미지원.

## D-018 구성원 초대는 서버 Route + service role (Live 전용)
- WHY: 초대(auth.admin)는 service role이 필요. 키는 서버 Route Handler에서만 읽고, 호출자 토큰·역할(OWNER)을 먼저 검증.
- OWNER 계정 변경·이전은 앱에서 하지 않음 (Supabase에서 직접). 키 미설정 시 USER ACTION 안내 + SQL 대안.

## D-019 익명 고객 이벤트 insert 정책 수정 (버그 수정)
- 003의 `exists (select from organizations)` 조건은 anon에게 organizations 조회 권한이 없어 **항상 거부**됨 → Live에서 고객 이벤트가 전혀 기록되지 않는 결함.
- 005에서 security definer 함수(`org_exists`, `product_in_org`)로 교체. 로컬 Postgres 검증으로 발견·확인.

## D-020 Live 검증은 로컬 Supabase 호환 스택으로 (PASS 3)
- WHY: 실제 Supabase 자격증명이 없어도 Live 경로(인증·RLS·초대 메일·오류 처리)를 브라우저로 끝까지 검증하기 위해.
- 구성: Supabase Auth(GoTrue)를 소스에서 빌드한 실제 서버 + PostgREST 호환 게이트웨이(이 앱이 쓰는 범위만, 요청마다 JWT 검증 후 role·claims 설정 → 실제 RLS 적용) + SMTP 수신.
- 한계: 게이트웨이는 PostgREST 자체가 아니며 Realtime은 흉내 내지 않음 → 실제 Supabase 연결 후 1회 재확인 필요.

## D-021 익명 쓰기는 RETURNING 없이 (버그 수정)
- 익명 고객은 beauty_profiles를 조회할 수 없으므로 insert+select는 RLS로 거부됨. id를 클라이언트에서 만들고 결과를 돌려받지 않는다. Live E2E로 발견.

## D-022 익명 이벤트 보호 (migration 006)
- 세션당 분당 60건, 조직당 분당 3,000건, Finder 결과 세션당 시간당 20건, payload 4KB, session_id 8~64자. 기록 시각은 서버 시각으로 강제(과거 날짜 주입으로 KPI 조작 방지). 로그인 구성원 입력은 한도 미적용.
- 한도는 `event_limits()` 한 곳에서 조정.

## D-023 역할 확인 전에는 역할 기반 메뉴·표시를 보류 (roleReady)
- 기본값 STAFF를 잠깐 보여주면 대표가 '직원'으로 보이고 메뉴가 깜빡임. 확인 중 표시 후 한 번에 그린다.

## D-024 Next.js 16 업그레이드
- WHY: next 15.x 내장 postcss 취약점(npm audit) 해소. 업그레이드 후 audit 0건, 전체 회귀(Demo·Live·DB) 통과. 빌드는 Turbopack 기본.

## D-025 상품 일괄 등록 = SKU upsert, 빈 칸은 기존 값 유지
- WHY: 부분 수정 파일(가격만 바꾼 목록 등)을 올려도 다른 항목이 지워지지 않도록. 새 상품은 공개 열이 없으면 비공개.

## D-026 고객 회원은 계약 범위 (D-006 보완)
- 계약 별지 제1호 ⑥이 고객계정·마이페이지·구매이력·재구매 예상시점을 요구 → 익명 이벤트(D-006)는 유지하고 회원을 추가.
- 필수(개인정보 수집·이용)·선택(재구매·신제품 안내) 동의 분리, 동의 시각·버전 저장. Live는 처리방침 URL·버전 환경변수가 없으면 가입을 막는다 (계약 제17조).
- 운영자 계정은 고객 가입 불가, 고객 계정은 운영 조직 생성 불가 (DB 정책·함수로 강제).
- 가입 전 같은 브라우저의 익명 추천 기록은 `claim_session`으로 계정에 연결.
- 탈퇴: 서버 API(service role)로 계정·구매기록·로그인 정보 삭제, 추천 기록은 계정 연결만 끊어 익명 통계로 유지. 서버 키가 없으면 본인 권한으로 가능한 범위만 삭제하고 안내.

## D-027 구매이력은 외부 채널 구매의 "기록" (결제 없음)
- PG·주문 연동은 계약 제외 범위. 고객 자기기록(SELF) + 운영자 기록(STAFF)으로 구매이력을 남긴다. 고객은 운영자 기록을 삭제할 수 없다.

## D-028 재구매 예상일 = 구매일 + 사용기간 × 수량
- 제품별 사용기간(`usage_days`) 우선, 없으면 종류별 기본값을 "추정"으로 표시(에센스/앰플 45·크림 60·토너/미스트 60·클렌저 60·선케어 45·마스크 30일). 실제 용량·사용량 확인 후 제품별 입력으로 대체.
- 안내 대상은 예상일 7일 전 ~ 14일 경과. 마케팅 수신 미동의 회원에게 광고성 안내 금지 표시.

## D-029 정산·미수금 = 청구·입금 기록
- 받을 돈 = 청구액 − 입금액 (취소·완납 제외). 입금액에 따라 상태 자동(미입금·부분·완납). 연체는 입금 기한 경과 잔액 → RULE Action "연체 미수금 회수".
- 대표·관리자 전용 (직원 RLS 차단).

## D-030 월별 이익 = 매출총이익 (원가 입력 제품만, 판관비 제외)
- 원가가 없는 제품은 이익 계산에서 제외하고 "원가 입력 매출 n% 기준"을 함께 표시 — 이익을 과장하지 않기 위해.

## D-031 대표 브리핑 = RULE 요약
- 모든 문장은 기록된 숫자에서 생성, 근거가 없으면 문장을 만들지 않음. 직원에게는 매출·이익·미수금을 뺀 운영 브리핑. LLM 문장 자연화는 승인 시(D-012).

## D-032 CSV 내보내기: 권한별, 고객 개인정보 제외, 영문 파일명
- 판매·월별·정산은 대표·관리자. 회원 이메일·이름은 내보내기 없음. 상품목록 내보내기 파일은 상품 일괄 등록 양식과 호환(왕복 시 "변경 없음" 검증).

## D-033 실데이터 시작 가이드는 저장된 데이터로 자동 판정
- 체크박스 수동 표시 대신 실제 기록(상품·재고·판매 28일·구매 링크·Baseline 3·첫 Action·첫 Proof 등)으로 완료를 판정. Demo 시드(`source=seed`, Demo 채널, `demo-st-` 정산)는 세지 않는다 — Demo 숫자로 "준비 완료"처럼 보이지 않게.

## D-034 대표 브리핑 AI 문장화 (D-012 구현, 기본 꺼짐)
- Claude는 RULE 브리핑 문장만 입력받아 다시 쓴다(원본 판매·고객 데이터·개인정보는 보내지 않음). 출력에 입력에 없는 숫자가 있으면(1~3 제외) 버리고 RULE 요약 유지, 거절(refusal)도 동일. 범용 AI 프록시가 되지 않도록 입력 형식(12줄·300자, 브리핑 주제)만 허용.
- 서버 전용 키, OWNER/ADMIN만, 인스턴스당 시간당 20회. 켜는 조건: 서버 `AI_BRIEFING_ENABLED=true` + `ANTHROPIC_API_KEY`, 화면 `NEXT_PUBLIC_AI_BRIEFING=on`. Demo는 `AI_BRIEFING_ALLOW_DEMO=true`일 때만.
- WHY 기본 꺼짐: 외부 AI 사용료는 고객사 부담(계약 제16조) → 승인 전에는 비용이 생기지 않게. 꺼져 있어도 RULE 브리핑으로 완료기준(대표자용 요약)은 충족.

## D-035 접근성 기준 = WCAG 2.1 A/AA 자동 점검 0건
- 상태 색 `--success #166534`·`--warning #92400E`(흰 바탕 6:1 이상), 금색 글자는 장식용 `--b-gold` 대신 `--b-gold-ink`(테마 강조색 40% + 진한 갈색). 짙은 배경 위 금색은 원래 강조색 유지. 가로 스크롤 표는 키보드로 포커스 가능(`tabIndex=0`).

## D-036 공개 전 점검은 "로그인 안 한 사람" 기준으로 실제 조회해 판정
- DB 설치 여부는 migration별 대표 테이블·열·함수를 익명 키로 조회해 판단(없음 = 404/42P01/42703/PGRST202). 내부 데이터 노출은 같은 테이블을 익명·구성원으로 각각 조회해 비교: 익명에게 1행이라도 보이면 "문제", 구성원도 0행이면 "데이터 입력 후 재확인".
- 서버 키는 값 대신 설정·유효 여부만(관리 키는 사용자 1명 조회로 유효성 확인). 결과는 저장하지 않는다.
- WHY: 시험버전 공개(완료기준 마지막 항목)는 고객사가 직접 설정하므로, 설정 실수 — 특히 RLS 누락으로 판매·고객 정보가 공개되는 사고 — 를 공개 전에 화면에서 잡기 위해. 로컬 Live E2E에서 판매 테이블 RLS를 끄면 "문제"로 잡히는 것까지 확인.

## D-037 새 Supabase 프로젝트는 setup_all.sql 한 번으로 (자동 생성, 직접 수정 금지)
- 001·002·003·005·006·007을 begin/commit 한 트랜잭션으로 묶은 생성 파일. migration 파일이 원본이며 `verify:db`가 (1) 최신 여부 (2) 새 DB 적용 후 스키마가 개별 적용과 같은지 비교한다.
- WHY: 6개 파일을 순서대로 붙여 넣는 수작업에서 005·007 누락이 가장 흔한 실패 원인(003만으로는 고객 이벤트가 기록되지 않음 — D-019). 001~003은 재실행 불가라 일부 적용된 프로젝트에는 쓰지 않는다.

## D-038 주간 운영 점검 = 입력 공백·처리 지연 6항목 자동 판정
- 판매 최근 7일 이내, 실제 상품 재고 7일 이내 확인, 3일 넘은 미검토 Action 0, 14일 넘게 멈춘 진행 중 Action 0, 미확정 Proof 0, 연체 미수금 0. 기준은 `ROUTINE_RULES` 한 곳, 화면에 기준 문장을 함께 표시.
- 입력 항목은 Demo 시드를 세지 않는다(D-033과 같은 범위). 시작 가이드를 마치면 대시보드 배너가 운영 점검으로 바뀐다. 주간 리포트(현재 주, 대표·관리자)에 인쇄용으로 포함.
- WHY: 실증의 가장 큰 위험은 데이터 입력이 멈추는 것(QA Five Devil Q2). 사람이 기억하지 않아도 매주 같은 기준으로 드러나게.

## D-039 공개 사이트 기본 보안 헤더 + 검색 노출 기본 차단
- 모든 응답: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`(카메라·마이크·위치·결제 차단), `X-Frame-Options: SAMEORIGIN` + `CSP frame-ancestors 'self'`(다른 사이트가 로그인 화면을 감싸는 클릭재킹 차단, Device View는 같은 출처라 영향 없음). HSTS는 Vercel이 제공.
- 검색: Demo이거나 `NEXT_PUBLIC_ALLOW_INDEXING=on`이 아니면 전체 `noindex` + robots `Disallow: /`. 허용해도 `/ax`·`/login`·`/api`는 항상 제외.
- WHY: 공개 Demo 주소에 실제 브랜드명(MIRYEO)과 Demo 제품·숫자가 있어, 검색되면 Demo가 실제 제품·실적처럼 보일 수 있음(원칙: Demo를 실적처럼 보이게 하지 않는다). 고객 화면 검색 노출은 사업 판단이라 기본 꺼짐.

## D-040 push = Production 배포 → push 전 전체 회귀 필수
- 2026-10-07 확인: GitHub 기본 브랜치가 작업 브랜치이고 Vercel이 push마다 Production(https://gayeon-miryeo-kbeauty-growth-ax.vercel.app)에 배포. 따라서 커밋 전 Demo 회귀(Flow·PASS2·PASS3·Stage2·PASS6·Route 31×8·접근성)를 통과한 뒤에만 push. Live·DB 관련 변경은 Live E2E·verify:db까지.
- 배포 후 `curl`로 공개 주소의 전 화면 200·DEMO 표기·헤더를 확인한다. (작업 환경의 브라우저는 프록시 인증서 문제로 공개 주소에 직접 접속하지 않으며, 인증서 검증을 끄는 우회는 하지 않는다.)

## D-041 화면 설정(테마·글자 크기·모션 줄이기)은 첫 화면 전에 적용
- `src/lib/themes.ts`의 `SETTINGS_BOOT_SCRIPT`를 root layout `<head>`에서 실행해 저장값을 `<html>`에 먼저 적용. `SettingsProvider`는 저장값을 읽은 뒤에만 속성을 바꾼다(그 전에 기본값으로 덮어쓰지 않음). 테마 상수는 React 의존 없는 `src/lib/themes.ts`로 이동.
- WHY: 기존에는 hydration 뒤 useEffect에서 적용 → 다른 테마를 고른 사용자가 매 페이지 진입마다 기본 네이비를 잠깐 봄, '모션 줄이기' 사용자에게 첫 애니메이션이 재생됨(접근성). 회귀 테스트(7 Theme 색 비교)가 간헐 실패로 드러냄 — 테스트 문제가 아니라 실제 결함.

## D-042 실제 판매 파일 하나로 시작 — 미등록 상품·채널은 가져오기 화면에서 바로 등록 (계약 3단계 "실제 자료 적용")
- 실제 쇼핑몰 주문 엑셀에는 아직 등록하지 않은 상품·채널이 섞여 있음 → 기존엔 상품을 먼저 하나씩 등록해야 해서 첫 입력이 막힘. 파일에서 미등록 목록을 모아 그 자리에서 등록 후 자동 재검증.
- 추정값은 모두 화면에 '추정'으로 표시하고 저장 전 확인: 카테고리=상품명 키워드, 판매가=파일 매출÷수량(할인 반영 — 정가와 다를 수 있음), 채널 유형=채널명 키워드. 추정이 없으면 빈칸(필수 입력). 새 상품은 고객 화면 비공개·실데이터·'신규', SKU가 없으면 겹치지 않는 `AUTO-YYMMDD-NN`.
- 대표·관리자만 (DB 정책도 상품·채널 쓰기는 OWNER/ADMIN). 직원에게는 안내만. ID는 클라이언트 UUID로 만들어 저장 직후 판매 행이 바로 연결된다 (Demo·Live 동일).

## D-043 사업화 실적 자료 = 시스템 기록의 집계만 (평가·전망·회사 소개 없음)
- 정책자금·보증·벤처 신청서에 붙이는 '근거'. 매출 추이·채널·B2B·수출·제품·고객 반응·AX 운영·데이터 출처. 해석·사업계획은 신청서 본문(대표)에서.
- 증감은 **완료된 달끼리** 비교(진행 중인 이번 달은 '진행 중' 표시, 비교 제외) — 며칠치 매출로 감소처럼 보이는 왜곡 방지. B2B·수출 누적액은 '입력값'으로 표시(판매 기록과 별도).
- Live: Demo 표시 상품·시드 판매 제외. Demo: '제출 불가' 경고. 근거 CSV는 구분·항목·기간·값·단위·근거 열.

## D-044 면담·현장확인 대비는 실제 화면 시연 순서 + 시스템 사실만으로 답변
- 7단계 시연(대시보드 → 고객 추천 → 고객 행동 반영 → 판단·승인·실행·결과 → 재고 → 실증 → 자료 출력), 단계마다 현재 데이터 근거를 함께 표시. 예상 질문 7개 중 회사 계획·특허 세부는 '대표 답변 준비'로 남기고 내용을 만들지 않는다.
- Demo에서는 "현장확인에서 Demo 숫자를 실제처럼 보여주면 안 됨" 경고(연습용). 개인정보 처리방침 '연결됨'은 실제 URL이 있을 때만 말한다.

## D-046 프레임워크 보안 공지는 같은 PASS 안에서 반영
- Next.js 16.3.7 → 16.4.0 (high 6건). 공개 사이트가 push마다 배포되므로 취약 버전을 배포하지 않도록 `package.json` 하한도 올린다. 업그레이드 후 전체 회귀 필수(D-040).

## D-045 장식용 차트는 화면낭독기에서 숨기고, 같은 정보를 글(목록·표)로 제공
- recharts 도넛 조각은 이름 없는 `role=img` + 빈 탭 정지점을 만든다. 옆 목록이 채널·금액을 글로 주므로 차트는 `aria-hidden` + `rootTabIndex=-1`. 접근성 검사는 차트 애니메이션이 끝난 뒤 실행한다(이전 검사는 렌더 전에 돌아 이 문제를 놓쳤음).

## D-047 Supabase 연결 전 실데이터는 백업 파일로 보관·이관 (재입력 없음)
- 사용자 지시(2026-10-09): Supabase는 나중에 연동. Demo 주소에 넣은 실데이터는 그 브라우저에만 있음 → 파일(`miryeo-transfer` v1, JSON)로 받아 두고 Live 전환 후 가져온다. 같은 파일로 Demo 복원도 가능.
- 범위: Demo 시드를 뺀 채널·상품·재고·판매·정산 + Pilot 시작일·AX OWNER(비어 있을 때만 적용). Demo 상품에 대한 판매는 제외, 실판매가 쓴 Demo 채널은 포함하고 이름 변경 안내. 제외: 고객 개인정보(계약 제6조 대량 고객자료 이전 제외·개인정보 보호), 고객 행동, Action/Proof 이력(그 환경의 사건), Baseline(운영 환경에서 다시 잠금).
- 가져오기는 '추가만': 같은 ID·SKU(상품), 이름(채널), 거래처·청구일·금액·구분(정산), 날짜·상품·채널·수량·매출(판매)이면 건너뜀 → 여러 번 가져와도 중복 없음, 기존 값 덮어쓰지 않음. 순서 채널→상품→재고→판매(500행씩)→정산→설정, 중간 실패 시 다시 가져오면 이어서 채워진다.
- 파일은 외부 입력으로 취급: 필드별로 검사해 새 객체 생성, 상한(20만 행·50MB), 링크는 http(s)만. 받기=대표·관리자(원가 포함), 가져오기=대표(조직 설정 변경 포함).

