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
