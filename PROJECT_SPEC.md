# PROJECT_SPEC — MIRYEO K-Beauty Growth AX

> 이번 회사의 최종 설계도. Source: MIRYEO Master Execution Prompt (2026-09-30) + Unified v4.1.
> 회사 사실이 확인되지 않은 항목은 `UNKNOWN / 확인 필요`로 둔다. 상상해서 확정하지 않는다.

## 1. PROJECT FINAL OBJECTIVE

가연인터내셔널의 상품·판매·재고·생산·채널·B2B·수출·고객 데이터를 하나의 Data Foundation으로 연결하고,
MIRYEO AI Beauty에서 발생한 고객행동을 Business AX의 Insight와 Action으로 돌려보내며,
대표와 직원의 실제 Action 결과가 다시 KPI와 Evidence로 축적되어
"데이터 기반 K-Beauty 제조·유통기업"으로 발전할 수 있는 실제 운영·실증 기반을 만든다.

정책자금·보증·투자가 없어도 회사가 쓸 경제적 이유가 있어야 한다 (Capital Independence Test).

## 2. DELIVERY STAGE / CAPABILITY STATUS

- DELIVERY STAGE: **PILOT / CONTRACT KICKOFF**
- AX VERDICT: **GO (PILOT)** — 다채널·OEM·B2B·수출 운영 구조상 데이터 연결 가치가 있음. 단 실제 업무량·데이터 규모는 1차 체크리스트로 재확인.

| 기능 | 상태 |
|---|---|
| Business AX UI / Rule Analytics | PILOT (Demo Seed 기반, Live Adapter 준비) |
| Data Mode (demo/live) | LIVE-READY (코드 완비, Supabase 설정 대기) |
| Supabase Schema / RLS | READY (migration 작성, 미실행) |
| Auth / Role | DEMO Role Switcher + LIVE Supabase Auth READY |
| Customer Event Bridge | PILOT (Demo: 브라우저 저장 / Live: customer_events insert) |
| Growth Action Lifecycle + Proof Event | PILOT |
| 실제 LLM | NEXT (CONDITIONAL) |
| 외부 쇼핑몰 API / PG | NEXT (NOT BUILDING) |

## 3. PRIMARY CONSTRAINT — PROVISIONAL

판매·재고·생산·채널·B2B·수출·고객 데이터가 여러 채널과 사람에게 흩어져 있어
어떤 제품을 더 생산할지 / 어떤 재고를 먼저 소진할지 / 어떤 채널을 키울지 / 어떤 고객을 다시 잡을지에 대한 판단이 늦고,
Customer Platform의 고객행동도 회사 고유 데이터 자산으로 충분히 축적되지 못한다.

> 1차 고객 체크리스트 수령 후 실제 현장문제 기준으로 재확정한다. (STATUS: PROVISIONAL)

핵심 기능의 연결: 대시보드(판단 속도) · 재고위험/생산추천(Money Leak) · Customer Event Bridge(Revenue Leak) · Action→Proof(판단→실행 추적).

## 4. PROCESS REDESIGN MATRIX

| 현재 단계 (추정, 체크리스트로 확인) | 문제 | 삭제 가능 | 표준화 | 디지털화 | 자동화 | AI 필요 | 최종 상태 |
|---|---|---|---|---|---|---|---|
| 채널별 판매 현황 수집 | 채널 관리자 화면/엑셀 분산 | 중복 취합 보고 | 판매 입력 포맷(CSV 템플릿) | sales_records | CSV 업로드 → 자동 집계 | 불필요 (RULE) | 한 화면 4주 매출·성장률 |
| 재고 확인 | 재고일수 수기 계산 | 수기 계산 | SKU·안전재고 기준 | inventory | 재고일수·위험 자동 산출 | 불필요 (RULE) | 품절/과잉 사전 경고 |
| 생산(OEM) 판단 | 대표 경험 의존 | — | 발주 판단 기준 | production_plans | 추천 발주량 계산 | 설명 문장만 LLM (NEXT) | 근거 있는 생산 Action |
| 고객 반응 파악 | 외부 플랫폼에 흩어짐 | — | 이벤트 정의(8종) | customer_events | Bridge 자동 집계 | 불필요 (RULE) | 관심 상승 → Action |
| 의사결정 후속관리 | 실행/결과 기록 없음 | 구두 지시 | Action 상태 5단계 | growth_actions/action_events | 상태 변경 로그 | HUMAN 승인 | Proof Event 축적 |
| 대표 보고 | 수기 보고서 | 수기 취합 | Evidence 구조 | proof_events | 리포트 자동 반영 | 요약 LLM (NEXT) | 12주 Evidence Pack |

## 5. CORE VALUE 3

1. **COST / EFFICIENCY** — 판매·재고·채널·생산 상태 확인과 판단에 드는 자료 탐색 시간, 누락, 재고위험 감소
2. **REVENUE / CUSTOMER** — 고객행동(관심제품·고민·Wishlist·Finder 결과·재방문)을 자사 데이터로 축적해 제품·마케팅·재구매에 활용
3. **SCALE / CAPACITY** — SKU·채널·고객·거래처가 늘어도 관리인력을 같은 비율로 늘리지 않는 Workflow

## 6. MONEY KPI 3 — 상세는 EVIDENCE_PLAN.md

| KPI | 정의 | BASELINE | MEASUREMENT POINT | TARGET |
|---|---|---|---|---|
| COST | 재고위험 발견 → 대응 Action 착수까지 시간 | REQUIRED / UNKNOWN | growth_actions.created_at → action_events(IN_PROGRESS) | DO NOT INVENT |
| REVENUE | Finder 완료 → Passport 저장 전환율 | REQUIRED / UNKNOWN | customer_events finder_complete / passport_save | DO NOT INVENT |
| SCALE | 담당자 1인당 관리 SKU·채널 수 / AX 경유 처리 비율 | REQUIRED / UNKNOWN | organization_members × products, action_events | DO NOT INVENT |

## 7. PRIMARY CONVERSION GOAL

**고객이 AI Beauty Finder를 끝까지 완료하고 추천 결과를 Beauty Passport에 저장하는 것.**
Secondary (최대 2): ① 추천 제품 Detail 확인 ② 실제 구매채널 이동.

## 8. BUSINESS IA (3~4 Group / Primary 9개, 14 이하)

| Group (Icon Hue) | Primary Item | Route |
|---|---|---|
| 운영 (Blue `#5B8DEF`) | 대시보드 | `/ax` |
| | 상품·재고·생산 | `/ax/products` |
| 고객·매출 (Amber `#D79A43`) | 채널·B2B·수출 | `/ax/channels` (STAFF 숨김) |
| | 고객 인사이트 (Data Bridge) | `/ax/customers` |
| AX·실증 (Teal-Green `#3C9A75`) | AI Growth Center (오늘의 Mission 포함) | `/ax/growth` |
| | 실증·Evidence | `/ax/reports` |
| | 기획의도 | `/ax/why` |
| 관리 (Slate `#718096`) | 데이터 관리 | `/ax/data` |
| | 설정 | `/ax/settings` |

AX Coach·Tech Asset은 신규 Top-level 메뉴 없이 Growth Center / Settings에 통합.

## 9. CUSTOMER IA

Header Primary: 홈 · AI 뷰티 파인더 · 제품 · 뷰티 패스포트 (+ Demo Control Bar: Device View, Business AX 보기 — 운영자/Demo만)
Primary Journey: `/beauty` → `/beauty/finder` → Result → Passport Save → `/beauty/products/[id]` → 구매채널(outbound)

## 10. SHARED DATA MODEL / SSOT

| Entity | System of Record | 입력 주체 | Update 방식 | 민감도 | 보관 | AI 사용 |
|---|---|---|---|---|---|---|
| Organization | `organizations` | OWNER | 수동 | 낮음 | 영구 | X |
| User / Membership | `profiles`, `organization_members` | OWNER | 초대/수동 | 중 (개인정보) | 재직기간 | X |
| Product | `products` | OWNER/ADMIN | 폼·CSV | 중 (원가) | 영구 | O (RULE) |
| Inventory | `inventory` | 전 직원 | 폼·CSV | 중 | 영구(스냅샷) | O |
| Production | `production_plans` | OWNER/ADMIN | 폼 | 중 | 영구 | O |
| Sale | `sales_records` (일/주 단위 행) | 전 직원 | CSV·폼 | 높음 (매출) | 영구 | O |
| Channel | `channels` | OWNER/ADMIN | 폼 | 중 (할인율) | 영구 | O |
| B2B Account | `b2b_accounts` | OWNER/ADMIN | 폼 | 높음 (거래조건) | 영구 | X |
| Export | `export_records` | OWNER/ADMIN | 폼 | 높음 | 영구 | X |
| Customer | `customer_profiles` | 시스템/직원 | 향후 CRM | 높음 (개인정보) | 동의 범위 | 제한 |
| Customer Event | `customer_events` | 고객(익명 session) | 자동 insert | 낮음 (익명) | 24개월 권장 | O |
| Beauty Profile / Recommendation | `beauty_profiles`, `beauty_recommendations` | 고객 | 자동 | 중 | 24개월 권장 | O |
| Growth Action | `growth_actions` | 시스템 생성 + 사람 처리 | 자동+수동 | 중 | 영구 | O |
| Action Event | `action_events` | 사람 | 자동 로그 | 중 | 영구 | X |
| Proof Event | `proof_events` | 사람 확인 | 수동+자동 스냅샷 | 중 | 영구 | X |
| Tech Asset | `tech_assets` | OWNER | 수동 | 중 | 영구 | X |

Sales는 Demo의 `weeklyUnits[]` 배열을 폐기하고 `sale_date / units / revenue` 행 구조로 정상화. Analytics는 Adapter(`buildModel`)에서 8주 주간 배열로 변환.

## 11. DATA BRIDGE (Customer ↔ AX Closed Loop)

```
Customer Event (view / wishlist / finder_start / finder_complete / passport_save / recommendation_view / outbound_purchase_click)
→ customer_events (anonymous session_id)
→ Business AX 고객 인사이트 KPI + 제품별 7일 관심점수
→ 관심 상승 RULE → Growth Action (NEW)
→ 사람: 검토(REVIEWED) → 승인·담당자 지정 → 실행(IN_PROGRESS) → 결과 기록(DONE)
→ Proof Event 생성 (KPI before/after 스냅샷 + 수동 결과)
→ OWNER 결과 확인(RESULT_CONFIRMED) → 실증·Evidence 반영
→ (선택 실행) 고객 화면 "지금 주목받는 제품" 노출 → Customer Experience 반영
```

## 12. ROLES

| 권한 | OWNER | ADMIN | STAFF |
|---|---|---|---|
| 매출·원가·마진 열람 | ✓ | ✓ | × |
| 채널·B2B·수출 메뉴 | ✓ | ✓ | × |
| 상품/채널/거래처 마스터 수정 | ✓ | ✓ | × |
| 재고·판매 입력 | ✓ | ✓ | ✓ |
| Action 승인/담당자 지정 | ✓ | ✓ | × |
| Action 실행·결과 기록 | ✓ | ✓ | ✓ (본인 담당) |
| Proof 결과 확정 | ✓ | × | × |
| 사용자/기술자산/Data Mode | ✓ | 열람 | × |

AX OWNER(실증 책임자)는 Auth Role과 별개: `AX_COACH_PLAN.md` — REQUIRED / UNASSIGNED.

## 13. AI METHOD MATRIX

| 기능 | Business Question | Input | Method | Output | Why This Method | Error Cost | Human Approval | Evidence |
|---|---|---|---|---|---|---|---|---|
| 재고 위험 | 언제 품절/과잉인가 | 재고, 4주 판매 | RULE | 재고일수·상태 | 수식으로 충분 | MID | 불필요(표시) | 재고 Action |
| 추천 발주량 | 얼마나 더 생산할까 | 판매속도·성장률·입고예정 | RULE (6주 예측) | 수량 | 설명 가능성 우선 | MID | 필수 | Proof |
| 성장/부진 SKU | 무엇이 뜨는가 | 4주 vs 이전 4주 | STATISTICAL (성장률) | 랭킹 | 단순 비교로 충분 | LOW | 불필요 | — |
| 채널 수익성 | 어디를 키울까 | 매출·할인율 | RULE (지수) | 수익성 지수 | 데이터 부족 단계 | MID | 필수 | Proof |
| 고객 관심 상승 | 어떤 제품에 수요 신호가 있나 | customer_events 7일 vs 이전 7일 | RULE (가중점수) | Growth Action | 이벤트 수 적음, ML 과함 | LOW | 필수 | Proof |
| Beauty 추천 | 고객에게 무엇을 권할까 | 고민·사용감·예산 | RULE (점수화) | 루틴 3~4 | 효능 Claim 없는 안전 추천 | MID | 불필요 | Finder 완료율 |
| 경영 요약 문장 | 오늘 무엇이 중요한가 | 위 결과 | LLM | 요약 | 자연어 설명 | LOW | 불필요 | NEXT (CONDITIONAL) |
| 문서 질의 | 규정/계약 찾기 | 회사 문서 | RAG | 근거 답변 | — | MID | — | NEXT (CONDITIONAL) |

## 14. DEMO / LIVE BOUNDARY

- `NEXT_PUBLIC_DATA_MODE=demo` (기본): Seed + 브라우저 저장소(localStorage). DEMO 배지, Demo Reset 가능.
- `NEXT_PUBLIC_DATA_MODE=live`: Supabase만 사용. 비어 있으면 Empty State, 오류면 Error State. **Demo로 몰래 fallback 금지.**
- Live 모드에서 Supabase env 누락 시 → 설정 오류 화면 (Demo로 전환하지 않음).

## 15. DEVICE VIEW (v4.1 P0)

Desktop(≥1024px, iframe 밖)에서 `[PC] [Mobile] [PC+Mobile]`. 동일 앱을 `?frame=mobile` iframe(390×844)으로 렌더,
postMessage(origin + source 검증) 양방향 Route Sync, `window.self !== window.top`이면 Device Switch 숨김. 상태 localStorage 저장.
Dual: PC 67% / Mobile 33% 고정 우측 패널, PC 영역은 Container Query로 반응.

## 16. 7 THEME (Canonical)

01 Deep Navy Blue(기본) · 02 Navy Gold · 03 Emerald Gold · 04 Forest Sage · 05 Deep Teal · 06 Onyx Gold · 07 Pure White — v4.1 Hex 그대로.
Legacy ID: `burgundy-slate`, `plum-indigo` → `deep-navy`, `steel-platinum` → `pure-white`로 자동 migration.
Customer Surface는 Picker 비노출, 동일 Token 사용 (AX 선택 Theme 전파).

## 17. PROJECT SIGNATURE 3

1. MIRYEO Premium K-Beauty Hero — 아이보리 캔버스 + 네이비/골드 보틀 구성 (Front Reference 재해석, 사진 수령 전 SVG 보틀)
2. AI Beauty Finder → Passport Journey — 6단계 Step + 결과 추천 이유 + Passport 저장
3. Customer Event → Business AX Growth Insight — 고객 인사이트 화면과 "관심 상승" Growth Action, 결과가 고객 화면 노출로 되돌아가는 Loop

## 18. CORE / CONDITIONAL / PLUS

- CORE: 1 Project Memory · 2 Demo/Live Architecture · 3 Supabase Schema/Migration/Repository · 4 Auth/Org/Role/RLS · 5 실데이터 입력 · 6 Customer Event Bridge · 7 Action Closed Loop · 8 Proof/Evidence · 9 Device View · 10 7 Theme + Motion + QA
- CONDITIONAL: 실제 LLM, 문서 AI, RAG, 외부 쇼핑몰 API, 알림, 고객 로그인, CRM, Excel Import, 실제 구매연동
- PLUS: 개인화 Feed, 추가 AI 분석, 고급 차트, Rich Motion, 추가 Journey, Presentation Mode

## 19. NOT BUILDING THIS PHASE

실제 PG/결제 · Naver/Coupang/백화점 실시간 API · 완전한 OMS/WMS · Native App · 대규모 CRM · 다국어 Mall · 피부 이미지 Vision 진단 · 자체 모델 학습 · L4 자동실행 · 복잡한 Agent 자동화. 사유: DECISIONS.md.

## 20. PRODUCT SHELL PARITY MATRIX

| 기능 | Desktop | 실제 Mobile | Device Preview | Discoverable | Parity |
|---|---|---|---|---|---|
| Navigation | Sidebar | Header Drawer + Bottom Nav | iframe 동일 | ✓ | ✓ |
| 날짜+현재시각 | Header | Header 압축 | 동일 | ✓ | ✓ |
| Theme | Header 팔레트 + 설정 | Drawer → 설정 | localStorage 공유 | ✓ | ✓ |
| Font Scale | 설정 | 설정 | 공유 | ✓ | ✓ |
| Role Preview | Header 프로필 + 설정 | 설정 | 공유 | ✓ | ✓ |
| Tutorial | 설정 → 다시 보기 | 동일 | 동일 | ✓ | ✓ |
| Why / Story | Sidebar | Drawer | 동일 | ✓ | ✓ |
| Demo Reset | 설정 | 설정 | 공유 | ✓ | ✓ |
| Surface Switch | Header "고객 화면" / Demo Bar "Business AX" | Drawer / Demo Bar | 동일 | ✓ | ✓ |

## 21. ACCEPTANCE TEST

Prompt §32 Whole-App Acceptance Run + §33 Device QA + §34 Functional QA. 결과는 QA_REPORT.md에 PASS / FAIL / NOT VERIFIED로 기록.
