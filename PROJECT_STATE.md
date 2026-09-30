# PROJECT_STATE — MIRYEO K-Beauty Growth AX

LAST UPDATED: 2026-09-30 (PILOT V2 PASS 3)
DELIVERY STAGE: PILOT Foundation (Contract Kickoff)
CURRENT PASS: 3 — Live 경로를 로컬 Supabase 호환 스택에서 브라우저 E2E로 검증, 결함 3건 수정, 익명 이벤트 보호, 상품 일괄 등록, Next 16. 실제 Supabase 연결은 USER ACTION 대기

## PASS 3 변경 요약
| 항목 | 상태 |
|---|---|
| 로컬 Supabase 호환 스택: Supabase Auth(소스 빌드) + PostgREST 호환 게이트웨이 + SMTP 수신 | 구축 (`supabase/tests/live-e2e/`) |
| Live 모드 브라우저 E2E 45단계 (로그인·조직 생성·실데이터·익명 고객·Action·Proof·Baseline·초대 메일·역할별 화면·장애) | **VERIFIED (로컬 스택)** |
| 결함 수정: 익명 고객 Finder 결과 저장이 RLS로 거부 (insert+select) | FIXED + VERIFIED |
| 결함 수정: 역할 확인 전 대표가 '직원'으로 보이고 메뉴가 줄어듦 | FIXED + VERIFIED |
| 결함 수정: Live에서 구매 링크 미등록 안내에 'Demo' 표기 | FIXED |
| DB 장애 시: 자동 재시도(~15초) 중 안내 → Error 화면, Demo 대체 없음 | VERIFIED |
| migration 006: 익명 이벤트 한도·서버 시각 강제·크기 제한 | VERIFIED (DB 10개 시나리오) |
| 상품 일괄 등록 CSV/XLSX (SKU upsert, 빈 칸 유지) | Demo·Live VERIFIED |
| Next.js 16.3.7 업그레이드 (npm audit 0건) | 전체 회귀 통과 |

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
- Live: 익명 이벤트 기록 → 로컬 Supabase 호환 스택 브라우저 E2E **VERIFIED**, 한도(006) VERIFIED. 실제 Supabase·Realtime은 NOT VERIFIED

## 4. EVIDENCE / AX COACH
- Closed Loop: Customer Event → Interest Rule → Growth Action → Human 상태 전환 → Result(KPI after) → Proof Event → OWNER 확정 → 성과·증빙 → **Demo VERIFIED**
- Baseline Lock 기능: 구현 완료. 실제 기준값: **REQUIRED / UNKNOWN** (고객 입력 대기)
- TARGET: DO NOT INVENT
- AX OWNER 지정 기능: 구현 완료. 실제 담당자: **REQUIRED / UNASSIGNED**

## 5. SYSTEM CORE
- DataSource 인터페이스(Demo / Live) — Demo VERIFIED, Live 구현 완료·NOT VERIFIED
- Supabase migration 001~006 — 로컬 Postgres 16에서 적용·재실행·RLS·트리거 65개 시나리오 VERIFIED, Supabase Auth 실서버와 함께 E2E VERIFIED. 실제 Supabase 프로젝트 적용은 NOT VERIFIED
- RLS: STAFF의 B2B/수출/고객 차단, 승인·보류 OWNER/ADMIN(트리거), proof 확정 OWNER, baseline·tech_assets·조직설정 OWNER, anon은 이벤트 기록·공개 상품만
- SERVICE ROLE key: `/api/org/members` 서버 Route에서만 사용 (선택). 클라이언트 번들 검사: 키 값·서버 코드 없음

## 6. DEVICE VIEW
- PC / Mobile(390×844 iframe) / PC+Mobile — VERIFIED
- Route 양방향 동기화, 새로고침 유지, frame 내부 switch 숨김(중첩 없음) — VERIFIED
- 높이 < 약 880px이면 frame이 비율 축소 (내부 viewport 390 유지) — KNOWN

## 7. QA
- Next 16 기준 typecheck / build PASS, Route QA 23×8 이상 0, Demo Acceptance 31/31 · PASS2 33/33 · PASS3 11/11, Live E2E 45/45, DB 65/65 → `QA_REPORT.md`

## 8. USER ACTION QUEUE
| # | 구분 | 작업 | 상태 |
|---|---|---|---|
| 1 | SUPABASE | Project 생성 | WAITING |
| 2 | SUPABASE | migration 001→002→003→**005→006** 실행 (004 선택) | WAITING |
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
- Realtime(고객 이벤트 즉시 반영)은 로컬 스택에 없어 NOT VERIFIED — Live에서는 새로고침/재방문 시 반영은 확인됨
- 로컬 게이트웨이는 PostgREST 호환 최소 구현 — 실제 Supabase 연결 후 1회 재확인 필요
- Demo seed 고객 이벤트는 세션이 흩어져 있어 주간 REVENUE 전환율이 0%로 보일 수 있음 (Demo 한정)
- 기술자산 상태 기본값 "미확인"

## 10. NEXT PRIORITY
1. (USER ACTION 1~6 완료 시) **실제 Supabase 연결 확인**: `e2e.mjs`와 같은 순서로 1회 (특히 Realtime, 초대 메일 Redirect URL)
2. 실제 판매·상품 엑셀 수령 → 열 별칭 보강 → 첫 실데이터 입력 지원 (Week 0)
3. 고객 화면 공개 준비: 실제 제품 정보·구매 링크 확인, 봇 방지(R-14) 필요성 판단
4. Week 1~4 운영 지원: 주간 리포트 기반 점검 루틴
5. (승인 시) LLM 경영 요약 — D-012
