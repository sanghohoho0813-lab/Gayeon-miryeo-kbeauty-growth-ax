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
