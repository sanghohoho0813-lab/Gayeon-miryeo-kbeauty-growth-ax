# QA_REPORT — MIRYEO K-Beauty Growth AX (PILOT V2 PASS 1)

DATE: 2026-09-30 · MODE TESTED: DEMO (production build, `next start`) · BROWSER: Chromium (Playwright)

## 1. Release Gate
| 항목 | 결과 |
|---|---|
| `npm run typecheck` (tsc --noEmit) | PASS |
| `npm run build` | PASS (19 routes) |
| Route QA: 22 route × 8 viewport (1920/1440/1280/1024/768/430/390/360) — 가로 overflow, console error, HTTP error | PASS (0건) |
| Whole-App Acceptance Flow | PASS 31/31 |
| LIVE 모드 (Supabase Auth·RLS·Realtime) | **NOT VERIFIED** — 자격증명 없음 |
| Migration SQL 실제 적용 | **NOT VERIFIED** |
| 실기기(iOS/Android) | NOT VERIFIED |
| Screen reader | NOT VERIFIED (ESC·포커스 복원·aria-label만 확인) |

## 2. Acceptance Flow 31항목 (모두 PASS)
Tutorial: 실제 Route 이동 / 종료 후 Overlay 0 / Sidebar 클릭 가능
Role: STAFF 메뉴 숨김 / STAFF KPI 대체 / STAFF 채널 직접 접근 차단
Theme: 7 Theme Shell 색 모두 상이 / Legacy migration / Settings Picker 7개
Device View: switch 노출 / Frame 390×844 / Frame 내부 switch·재귀 0 / Frame Bottom Nav / Dual overflow 0 / PC→Mobile 동기화 / Mobile→PC 동기화 / 새로고침 유지 / Mobile 동일 Route / Frame 잘림 0
Closed Loop: Customer Event 기록 / AX 실시간 반영 / 관심 상승 → Action 자동 생성 / DONE + KPI Before·After / 이력 5건+ / Proof 생성 / OWNER 확정 / 고객 화면 노출 반영 / Outbound 안내 + 이벤트
System: Demo Reset / Reset 후 정상 / Page error 0

## 3. Theme 7 상태
deep-navy · midnight-slate · forest-emerald · sage-evergreen · ocean-teal · charcoal-graphite · pure-white — 모두 렌더링 확인(Shell 색상 검사 + pure-white 스크린샷 육안 확인). Reduced motion(OS + 설정) 적용.

## 4. KNOWN ISSUES
| # | 내용 | 영향 |
|---|---|---|
| K-1 | 창 높이 약 880px 미만이면 Mobile frame이 비율 축소 표시 (내부 viewport 390 유지) | 시각적, 기능 영향 없음 |
| K-2 | 연속 동작 시 Toast 여러 개 쌓임 | 사소 |
| K-3 | Demo seed로 열린 Rule Action 다수(약 11건), B2B·수출 추세 음수 | Demo 한정 |
| K-4 | 구성원 초대 UI 없음 (SQL 수동) | Live 운영 시 불편 |

## 5. Score (자체 평가, 근거 포함)
- Strategy Fit: 8/10 — Closed Loop·Evidence·Money KPI 3 구현, Baseline/AX OWNER 미확정으로 감점
- Product Readiness: 7/10 — Demo 완결, Live 미검증으로 감점
- P0 잔여: 없음 (Demo 기준). Live 전환 시 P0 후보 = RLS 실검증

## 6. Red Team
- Demo 숫자가 실적처럼 보이는가 → 모든 화면 DEMO 배지·"Demo" 제품명, Baseline "REQUIRED / UNKNOWN"
- 허위 사실 → 평점·리뷰수·효능·인증·특허 표기 제거, 기술자산 "미확인"
- Live에서 Demo 섞임 → DataSource 분리, 실패 시 Error State (코드 검토로 확인, 실행 NOT VERIFIED)
- 키 노출 → 클라이언트는 anon key만, service role 미사용

## 7. Five Devil Questions
1. **이게 없으면 가연인터내셔널이 실제로 손해 보는가?** — 재고 품절·과잉 판단과 고객 관심 변화를 엑셀·감으로 늦게 안다. Pilot은 이 판단을 주 단위→일 단위로 당기는 것이 목적. 단, 손해 규모는 Baseline이 없어 **UNKNOWN**.
2. **대표가 매주 실제로 열 이유가 있는가?** — 오늘의 Mission 3개 + Money KPI 3 + 확정 Proof. 데이터 입력이 멈추면 가치가 0이 되므로 AX OWNER 지정이 전제.
3. **Demo를 걷어내도 작동하는가?** — 구조는 그렇다(Live DataSource·RLS·Empty/Error). 실행 검증은 아직 안 됨(NOT VERIFIED).
4. **AI라고 부를 근거는?** — 현재 RULE/STATISTICAL. 화면에 방법을 명시했고 LLM은 READY로만 표시. 과장하지 않음.
5. **증빙이 외부(정부과제·투자)에서 통하는가?** — Action 이력·KPI before/after·OWNER 확정 Proof는 남는다. 기준선과 기간이 없으면 효과 주장 불가 → Pilot 시작일·Baseline 입력이 선행 조건.
