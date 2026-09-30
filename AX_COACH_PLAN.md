# AX_COACH_PLAN

AX Coach = Evidence Operating System. 신규 메뉴 없이 **AI Growth Center > 오늘의 Mission**으로 통합.

## AX OWNER
AX OWNER: **REQUIRED / UNASSIGNED** (가연인터내셔널 담당자 확인 후 기입)
책임: KPI Baseline, 데이터 품질, 사용 교육, Action 결과 확인

## MONEY KPI 3 / BASELINE STATUS
EVIDENCE_PLAN.md 참조 — 3개 모두 REQUIRED / UNKNOWN

## CORE CLOSED LOOP
Customer Event → 관심 상승 RULE → Growth Action → 검토 → 승인·담당 → 실행 → 결과 → Proof Event → OWNER 확인 → Report

## TODAY MISSION 규칙
- 하루 최대 3개. 우선순위: 우선 > 높음 > 중간, 같은 등급은 NEW > REVIEWED > IN_PROGRESS 중 오래된 것
- 각 Mission은 "무엇을 / 왜 / 완료 조건"을 한 줄로
- DONE/DISMISSED는 Mission에서 제외

## PROOF EVENT TYPES
`INVENTORY_RISK_RESPONSE` · `PRODUCTION_ADJUSTMENT` · `CHANNEL_STRATEGY` · `CUSTOMER_INTEREST_RESPONSE` · `B2B_FOLLOWUP` · `REPURCHASE_OUTREACH` · `MANUAL`

## MISSION → ROUTE MAPPING
| Action 카테고리 | 처리 화면 |
|---|---|
| 재고 / 생산 | `/ax/products?tab=inventory` · `production` |
| 채널 / B2B | `/ax/channels` |
| 고객 관심 | `/ax/customers` |
| 재구매 | `/ax/customers` |

## WEEKLY EVIDENCE TARGET
Week 1~4: Proof Event 주 1건 이상 기록 (결과 확정 여부와 무관, 실제 실행 건만)

## RESULT 확인 방식
- 자동 스냅샷: Action 승인 시점 KPI(kpi_before), 완료 시점 KPI(kpi_after)
- 수동: 실행 메모·결과 텍스트, 필요 시 증빙 링크
- OWNER가 RESULT_CONFIRMED 처리해야 Evidence로 집계

## ADOPTION RISK
- 입력 부담: CSV 템플릿·재고 수정 1클릭으로 최소화
- 직원 이익: 오늘 할 일 3개 명확화, 보고서 수기 작성 감소
- 대표만 쓰는 시스템 위험 → STAFF 담당 Action 비율 추적

## KILL / REDESIGN CRITERIA
실제 기준값은 Pilot 4주차에 회사와 합의 (Demo에서 지어내지 않음). 후보: 주간 사용 0회 2주 연속, Proof 0건 4주, 입력 부담 증가 보고.
