# PROJECT_STATE — MIRYEO K-Beauty Growth AX

LAST UPDATED: 2026-09-30 (PILOT V2 PASS 2)
DELIVERY STAGE: PILOT Foundation (Contract Kickoff)
CURRENT PASS: 2 — Week 0 운영 도구(Baseline Lock·주간 리포트·파일 가져오기·구성원 초대) + DB 실검증 완료. Live 연결은 USER ACTION 대기

## PASS 2 변경 요약
| 항목 | 상태 |
|---|---|
| migration 001~005 + RLS 55개 시나리오 (로컬 Postgres 16 + Supabase auth stub) | VERIFIED — `npm run verify:db` |
| 결함 수정: 003의 익명 고객 이벤트 insert가 항상 거부됨 → 005에서 수정 (D-019) | FIXED + VERIFIED |
| Action 상태 전이·승인 권한 DB 강제, Proof 직접 확정 차단 (D-015) | VERIFIED (DB) |
| Realtime publication 등록 (customer_events, growth_actions) | VERIFIED (DB) |
| Baseline Lock (KPI별 기준값·기간·방법·출처, 이력 보존) + Baseline 대비 변화 | PILOT (Demo VERIFIED) |
| AX OWNER 지정 | PILOT (Demo VERIFIED) |
| 주간 Evidence 리포트 `/ax/reports/weekly` (주 이동, 인쇄·PDF) | PILOT (Demo VERIFIED) |
| 판매 파일 가져오기: CSV/XLSX, 한글 열 자동 인식·매핑, 날짜/금액 정규화, EUC-KR, 중복 의심 | PILOT (Demo VERIFIED) |
| 구성원 관리: 초대·역할 변경·제거 (Live: 서버 API, Demo: 브라우저) + 초대 수락 시 비밀번호 설정 | Demo VERIFIED / Live READY (NOT VERIFIED) |
BRANCH: `claude/miryeo-kbeauty-growth-ax-9urrn9`

> 다음 세션 시작 순서: PROJECT_SPEC → PROJECT_STATE(이 파일) → DECISIONS → EVIDENCE_PLAN → QA_REPORT → 아래 NEXT PRIORITY부터.

## 0. Audit 결과 (PASS 1 시작 시점, 1차 MVP 기준)
| 항목 | 이전 상태 | PILOT V2 조치 |
|---|---|---|
| Data Mode | README는 "Supabase 연결 시 자동 Live"였으나 코드는 항상 Demo | `NEXT_PUBLIC_DATA_MODE` 명시 전환, Live 실패 시 Error (fallback 금지) |
| Schema / RLS | 없음 | migration 001~004 |
| Auth / Role | 없음 | Supabase Auth + organization_members, Demo Role Switcher |
| 실데이터 입력 | 없음 | 데이터 관리(단건 + CSV Preview/Validation/Confirm) |
| 고객 → AX 연결 | Passport localStorage만 | customer_events Bridge + Interest Rule → Growth Action |
| Action 상태 | 화면 버튼만 | NEW→REVIEWED→IN_PROGRESS→DONE/DISMISSED + action_events 이력 |
| Proof | 없음 | proof_events (DRAFT→CONFIRMED/REJECTED, OWNER 확정) |
| Device View | 없음 | PC / Mobile / PC+Mobile, 같은 앱 iframe + Route Sync |
| Theme | 6개 비표준 | Canonical 7 (v4.1 Hex) + legacy migration |
| 허위 가능 데이터 | 평점·리뷰수·효능 문구 | 제거, Demo 표기 익명 제품 |

## 1. BUSINESS AX (`/ax`)
| 화면 | 상태 | 비고 |
|---|---|---|
| 대시보드 | PILOT | KPI drill-down, 오늘의 Mission, 고객행동 피드, Matrix, 랭킹, 채널(권한) |
| Growth Center | PILOT | Action 생애주기 Drawer, KPI before/after, 고객 노출 반영 |
| 고객 인사이트 | PILOT | 이벤트 집계, 관심 점수, 실시간 피드 |
| 제품·재고 | PILOT | 재고일수·추천발주(RULE/STAT) |
| 채널·B2B·수출 | PILOT (OWNER/ADMIN) | 입력 기반 |
| 데이터 관리 | PILOT | 단건 + 파일(CSV/XLSX, 열 매핑·검증·중복 감지), 샘플 템플릿 `public/samples/` |
| 실증·Evidence | PILOT | Money KPI 3 + Baseline Lock·대비 변화, Proof 확정/반려, 수동 Proof, 12주 계획 |
| 주간 Evidence 리포트 | PILOT | `/ax/reports/weekly`, 인쇄·PDF |
| 설정 | PILOT | 7 Theme·글자·모션·역할매트릭스·Demo Reset·Pilot 시작일·AX OWNER·AI 상태·기술자산·구성원 |
| 도입 배경(Why) | DEMO→설명 | 문서형 |
| AI 요약(LLM) | READY | Marker만, 미연결 (D-012) |

## 2. CUSTOMER FRONT (`/beauty`)
| 기능 | 상태 |
|---|---|
| 홈 / 지금 주목받는 제품(AX featured 반영) | PILOT |
| AI Finder (RULE 추천) | PILOT |
| 제품 목록·상세 | PILOT (Live는 is_published 상품만) |
| 구매 링크(outbound) | READY — 링크 미등록 시 "연결 예정" 안내 + 이벤트 기록 |
| Beauty Passport | PILOT (브라우저 저장) |
| 결제/주문 | NOT BUILDING |

## 3. DATA BRIDGE
- 이벤트 8종: view_product, wishlist_add/remove, finder_start, finder_complete, recommendation_view, passport_save, outbound_click
- 익명 session_id, 개인정보 미수집 (D-006)
- Demo: localStorage + storage/custom 이벤트로 PC·Mobile 즉시 동기화 → **VERIFIED**
- Live: anon insert RLS → DB 정책 **VERIFIED (로컬 Postgres)**, 실제 Supabase 연결은 NOT VERIFIED

## 4. EVIDENCE / AX COACH
- Closed Loop: Customer Event → Interest Rule → Growth Action → Human 상태 전환 → Result(KPI after) → Proof Event → OWNER 확정 → 성과·증빙 → **Demo VERIFIED**
- Baseline Lock 기능: 구현 완료. 실제 기준값: **REQUIRED / UNKNOWN** (고객 입력 대기)
- TARGET: DO NOT INVENT
- AX OWNER 지정 기능: 구현 완료. 실제 담당자: **REQUIRED / UNASSIGNED**

## 5. SYSTEM CORE
- DataSource 인터페이스(Demo / Live) — Demo VERIFIED, Live 구현 완료·NOT VERIFIED
- Supabase migration 001~005 — 로컬 Postgres 16에서 적용·재실행·RLS 55개 시나리오 VERIFIED. 실제 Supabase 프로젝트 적용은 NOT VERIFIED
- RLS: STAFF의 B2B/수출/고객 차단, 승인·보류 OWNER/ADMIN(트리거), proof 확정 OWNER, baseline·tech_assets·조직설정 OWNER, anon은 이벤트 기록·공개 상품만
- SERVICE ROLE key: `/api/org/members` 서버 Route에서만 사용 (선택). 클라이언트 번들 검사: 키 값·서버 코드 없음

## 6. DEVICE VIEW
- PC / Mobile(390×844 iframe) / PC+Mobile — VERIFIED
- Route 양방향 동기화, 새로고침 유지, frame 내부 switch 숨김(중첩 없음) — VERIFIED
- 높이 < 약 880px이면 frame이 비율 축소 (내부 viewport 390 유지) — KNOWN

## 7. QA
- typecheck / build PASS, Route QA 23 route × 8 viewport overflow·console error 0, Acceptance 31/31 + PASS 2 33/33, DB 55/55 → `QA_REPORT.md`

## 8. USER ACTION QUEUE
| # | 구분 | 작업 | 상태 |
|---|---|---|---|
| 1 | SUPABASE | Project 생성 | WAITING |
| 2 | SUPABASE | migration 001→002→003→**005** 실행 (004 선택) | WAITING |
| 3 | SUPABASE | OWNER 계정 생성 → `/login` → 조직 만들기 | WAITING |
| 4 | ENV | `NEXT_PUBLIC_DATA_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | WAITING |
| 5 | ENV | `NEXT_PUBLIC_MIRYEO_ORG_ID` (조직 생성 후) | WAITING |
| 6 | VERCEL | 환경변수 반영 + Redeploy | WAITING |
| 6-1 | ENV (선택) | `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 앱 내 초대용) + Supabase Redirect URL에 `/login` 추가 | WAITING |
| 7 | DATA | 실제 상품 1~2개, 재고, 판매 샘플, 구매 링크 | WAITING |
| 8 | DATA | Pilot 시작일 + Money KPI 3 Baseline 잠금 (실측·자기기록 값) | WAITING |
| 8-1 | DATA | 실제 판매 엑셀 샘플 1개 (열 이름 별칭 보강용) | WAITING |
| 9 | PEOPLE | AX OWNER 지정, ADMIN/STAFF 계정 목록 | WAITING |
| 10 | FACT | 법인 관계(가연인터내셔널·MIRYEO·OEM), 기술자산 상태 확인 | WAITING |

## 9. KNOWN ISSUES
- Live 모드 전체 NOT VERIFIED (자격증명 없음)
- Demo seed 특성상 Rule Action이 다수(약 11건) 열림, B2B·수출 추세 음수 표시 가능
- 토스트가 연속 동작 시 여러 개 쌓임 (기능 영향 없음)
- 구성원 초대: Live 실검증 전 (Supabase 초대 메일·Redirect 설정 필요)
- `npm audit`: next 15.x 내장 postcss 취약점 2건 — 수정은 Next 16 메이저 업그레이드 (R-10)
- Demo seed 고객 이벤트는 세션이 흩어져 있어 주간 REVENUE 전환율이 0%로 보일 수 있음 (Demo 한정)
- 기술자산 상태 기본값 "미확인"

## 10. NEXT PRIORITY
1. (USER ACTION 1~6 완료 시) **Live 연결 실검증**: 로그인 → 조직 → 상품 → 고객 이벤트(anon) → Action → Proof → Baseline → 초대, 역할별 계정 3개로 확인
2. 실제 판매 엑셀 수령 → 열 별칭 보강, 상품 일괄 등록(R-11)
3. 고객 화면 공개 전 anon 이벤트 속도 제한(R-12)
4. Next 16 업그레이드 + 전체 회귀 QA (R-10)
5. (승인 시) LLM 경영 요약 — D-012
