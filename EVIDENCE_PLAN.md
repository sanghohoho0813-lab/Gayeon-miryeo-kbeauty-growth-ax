# EVIDENCE_PLAN — 12 Week Pilot

> 실제 Baseline이 없으면 개선률을 만들지 않는다. 모든 목표값: **DO NOT INVENT**.
> Pilot 시작일(Week 0)은 설정 > 실증 운영에서 OWNER가 지정한다. 지정 전 상태: `NOT STARTED`.

## 1. MONEY KPI 3

### COST KPI — 재고위험 대응 리드타임
- 정의: 재고위험/생산 Growth Action 생성 → 담당자 실행 착수(IN_PROGRESS)까지 걸린 시간
- BASELINE STATUS: REQUIRED / UNKNOWN (현재 수기 대응 소요시간을 체크리스트로 1회 측정)
- MEASUREMENT POINT: `growth_actions.created_at` → `action_events(to_status='IN_PROGRESS').created_at`
- 보조: 주간 판매/재고 현황 취합 소요시간 (담당자 자기기록, 주 1회)
- TARGET: DO NOT INVENT

### REVENUE KPI — Finder → Passport 저장 전환율 (Primary Conversion)
- 정의: `passport_save` 세션 수 / `finder_complete` 세션 수
- BASELINE STATUS: REQUIRED / UNKNOWN (Customer Platform 공개 후 첫 2주를 Baseline으로 잠금)
- MEASUREMENT POINT: `customer_events` (anonymous session_id 기준)
- 보조: `outbound_purchase_click` / `view_product`
- TARGET: DO NOT INVENT

### SCALE KPI — 주당 완료 Action (시스템 측정, D-016)
- 정의: 기간 내 `action_events(to_status='DONE')` 수 ÷ 기간(주) — 단위 `건/주`
- 보조(자기기록): AX 경유 처리 비율 = Growth Action으로 처리한 운영 판단 / 전체 운영 판단
- 보조: 담당자 1인당 관리 SKU·채널 수 (`products`, `channels`, `organization_members`)
- BASELINE STATUS: REQUIRED / UNKNOWN
- TARGET: DO NOT INVENT

### Baseline Lock (PASS 2 구현)
- 실증·Evidence > MONEY KPI 3 에서 OWNER가 KPI별 기준값을 잠근다: 값·단위·측정 기간·측정 방법·출처(시스템 측정 / 담당자 자기기록 / 기존 문서).
- 잠근 값은 수정하지 않는다. 다시 잠그면 사유가 필수이고 이전 값은 `superseded_at`과 함께 이력으로 남는다 (`kpi_baselines`, migration 005).
- Baseline 대비 변화는 **잠금 후에만** 표시하며 방향(낮을수록/높을수록 좋음)을 함께 보여준다. 표본 수를 항상 병기한다.
- 주간 Evidence 리포트(`/ax/reports/weekly`, 인쇄·PDF)가 매주 같은 계산으로 KPI·Action·Proof·공백을 정리한다.

## 2. 12-WEEK PLAN

| 기간 | 목표 | 산출물 | 완료 판정 |
|---|---|---|---|
| Week 0 — Baseline Lock | 실데이터 1~2종 입력, KPI 3 Baseline 측정방식 확정, AX OWNER 지정 | 체크리스트 응답, Baseline 기록 | 3개 KPI에 BASELINE 값 또는 측정 시작일 기록 |
| Week 1~4 — Adoption / First Proof | 주 2회 이상 대시보드 사용, 첫 Proof Event 3건 | action_events, proof_events | RESULT_CONFIRMED ≥ 1 |
| Week 5~8 — Business Lift | 재고위험 대응 리드타임, Finder 전환 추이 비교 | 주간 KPI 스냅샷 | Baseline 대비 변화 기록 (값은 실측) |
| Week 9~12 — Enterprise Value / Judge Pack | Evidence Pack, Government/Investor Story | Evidence Pack | 12주 Proof 목록 + KPI Delta |

## 3. OPERATING EVIDENCE (운영 증거)
- 업무시간(판매·재고 취합), 재고위험 발견·대응 리드타임, Action 실행률
- Customer Event 수, Finder 완료, Passport 저장, 구매채널 이동
- 재구매 기회 대응, 매출/채널 변화 (실측 sales_records 기준)

## 4. ENTERPRISE VALUE EVIDENCE (기업가치 증거)
- 표준화된 Workflow (Action 5단계 + Proof)
- Proprietary Customer Data (고민·Finder 결과·관심 제품 — 외부 플랫폼이 아닌 자사 DB)
- 대표 개인의존도 감소 (STAFF 처리 Action 비율)
- 반복사용 구조 (주간 사용자 수)
- 고객 Lock-in (Passport 재방문)
- IP / 특허: 현재 **미확인** — 사실 확인 전 표시 금지
- 확장 가능한 Operation (SKU·채널 증가 대비 인력)

## 5. DATA SOURCE / PROVENANCE
모든 Evidence에 `data_source`(DEMO SEED / BROWSER DEMO / SUPABASE LIVE / MANUAL)와 `user_id`, 시각을 남긴다.
Demo 모드에서 생성된 Proof는 **실증 자료로 사용하지 않는다** (UI에 DEMO 표기).

## 6. GOVERNMENT STORY vs INVESTOR STORY (같은 Evidence, 다른 논리)

| 관점 | 강조 |
|---|---|
| Government / Policy | 현장문제(데이터 분산) → AX 도입 → 실사용·실증(Proof) → 생산성·매출·고용 효과 → 업종 확산 가능성 |
| Investor / Growth | 반복되는 K-Beauty 운영 문제 → 표준화 가능한 Workflow → 자사 고객데이터 Moat → Unit Economics → 자본 투입 시 채널·SKU 확장 속도 |

정책 관련 수치·제도 문구는 작성 시점 공식기관 자료 확인 후 기입 (현재: 미확인).
