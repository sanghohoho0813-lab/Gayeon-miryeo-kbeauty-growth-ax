# PROOF_EVENT_SCHEMA

Proof Event = "왜 판단했고 → 무엇을 했고 → 실제 결과가 무엇이었는지"를 남기는 실증 최소단위. 단순 Activity Log가 아니다.
DB: `public.proof_events` (supabase/migrations/001_base_schema.sql) · TS: `ProofEvent` (src/lib/types.ts)

| 필드 | 타입 | 설명 |
|---|---|---|
| proof_event_id (`id`) | uuid/text | PK |
| event_type | text | AX_COACH_PLAN의 PROOF EVENT TYPES |
| trigger | text | 판단을 유발한 신호 (예: "7일 관심점수 32, 이전 대비 +60%") |
| decision | text | 권장/결정 내용 |
| decision_method | text | RULE / STATISTICAL / LLM / HUMAN |
| why | text | 근거 요약 (Growth Action evidence) |
| human_approval | text | 승인자·시각 (없으면 "미승인") |
| action | text | 실제 실행 내용 (실행 메모) |
| result | text | 결과 (수동 기록) |
| kpi_before | jsonb | 승인 시점 자동 스냅샷 `{label, value}` 목록 |
| kpi_after | jsonb | 완료 시점 자동 스냅샷 + 수동 입력 |
| data_source | text | DEMO SEED / BROWSER DEMO / SUPABASE LIVE / MANUAL |
| user_id | uuid/text | 결과 기록자 |
| created_at | timestamptz | 생성 |
| result_confirmed_at | timestamptz | OWNER 확정 시각 |
| evidence_link | text | 증빙 URL (선택) |
| status | text | `RECORDED`(측정중) · `RESULT_CONFIRMED` · `REJECTED` |
| growth_action_id | text | 연결된 Action (추적성) |
| organization_id | uuid | 테넌트 |

## 생성 규칙
1. Growth Action이 DONE + 결과 텍스트 입력 시 자동 생성 (`status=RECORDED`)
2. OWNER만 `RESULT_CONFIRMED`로 전환 가능
3. Demo 모드 Proof는 `data_source=BROWSER DEMO` — 실증 자료로 집계하지 않음
4. KPI Delta는 before/after 스냅샷에서 계산하되, 인과 주장은 하지 않는다 (관찰 기록)
