# QA_REPORT — MIRYEO K-Beauty Growth AX (PILOT V2 PASS 2)

DATE: 2026-09-30 · MODE TESTED: DEMO (production build, `next start`) · BROWSER: Chromium (Playwright)

## 1. Release Gate
| 항목 | 결과 |
|---|---|
| `npm run typecheck` (tsc --noEmit) | PASS |
| `npm run build` | PASS (21 routes, API 1) |
| Route QA: 23 route × 8 viewport (1920/1440/1280/1024/768/430/390/360) — 가로 overflow, console error, HTTP error | PASS (0건) |
| Whole-App Acceptance Flow (PASS 1 회귀) | PASS 31/31 |
| PASS 2 Flow (Baseline·주간 리포트·PDF·파일 가져오기·구성원·권한) | PASS 33/33 |
| DB 검증 `npm run verify:db` (Postgres 16 + Supabase auth stub): migration 001~005, RLS·트리거 55개 시나리오, 005 재실행 | PASS 55/55 |
| Import 로직 단위 테스트 (열 자동 인식, 날짜 9종, 금액, 중복) | PASS 6/6 |
| 클라이언트 번들에 service role 키 값·서버 코드 포함 여부 | 없음 (안내 문구의 변수 이름만) |
| LIVE 모드 (실제 Supabase Auth·RLS·Realtime·초대 메일) | **NOT VERIFIED** — 자격증명 없음 |
| Migration을 실제 Supabase 프로젝트에 적용 | **NOT VERIFIED** (로컬 Postgres에서는 VERIFIED) |
| 실기기(iOS/Android) | NOT VERIFIED |
| Screen reader | NOT VERIFIED (ESC·포커스 복원·aria-label만 확인) |

## 2. Acceptance Flow 31항목 (모두 PASS)
Tutorial: 실제 Route 이동 / 종료 후 Overlay 0 / Sidebar 클릭 가능
Role: STAFF 메뉴 숨김 / STAFF KPI 대체 / STAFF 채널 직접 접근 차단
Theme: 7 Theme Shell 색 모두 상이 / Legacy migration / Settings Picker 7개
Device View: switch 노출 / Frame 390×844 / Frame 내부 switch·재귀 0 / Frame Bottom Nav / Dual overflow 0 / PC→Mobile 동기화 / Mobile→PC 동기화 / 새로고침 유지 / Mobile 동일 Route / Frame 잘림 0
Closed Loop: Customer Event 기록 / AX 실시간 반영 / 관심 상승 → Action 자동 생성 / DONE + KPI Before·After / 이력 5건+ / Proof 생성 / OWNER 확정 / 고객 화면 노출 반영 / Outbound 안내 + 이벤트
System: Demo Reset / Reset 후 정상 / Page error 0

### PASS 2 Flow 33항목 (모두 PASS)
Baseline: 없음 → REQUIRED 표시 / 개선률 미표시 / 잠금 → 값 표시 / 재잠금 사유 필수 / 이력 2행·활성 1행 / 이력 표시 / 승인 후 COST 측정 + Baseline 대비
AX OWNER 지정 → 실증 화면 반영
주간 리포트: 렌더 / AX OWNER·DEMO 표시 / 이전 주 이동 / 현재 주에서 다음 주 비활성 / 인쇄 시 메뉴·헤더 숨김 / PDF 생성
파일: 한글 열 5개 자동 인식 / 정상 2·오류 1 / 날짜·쉼표 금액 정규화 저장 / 재업로드 중복 의심 기본 제외 / XLSX + 기본 채널 / XLSX 날짜 셀 인식 / 기본 채널 적용 저장
구성원(Demo): 목록 / 초대 / 역할 변경 / OWNER·본인 편집 불가 / 제거 / 중복 초대 차단
권한: STAFF Baseline 잠금 없음 / STAFF 구성원 차단 / STAFF AX OWNER 비활성 · API Demo 400 · PASS 1 저장소 호환 · Page error 0

### DB 검증에서 발견·수정한 결함
- **P0 (Live)**: 003의 `events_public_insert`가 anon에게 보이지 않는 organizations를 조회 → 익명 고객 이벤트가 **항상 거부**. Live에서 Closed Loop의 시작점이 끊기는 결함. 005에서 security definer 함수로 수정, 수정 전/후 모두 재현·확인.
- 보강: STAFF가 API로 승인·보류·Proof 확정 상태를 직접 만들 수 있던 경로 → 트리거·정책으로 차단 (VERIFIED)

### PASS 2 QA 중 수정한 UI 결함
- 설정 390/430/360px 가로 넘침: 표 머리글의 sr-only(absolute)가 스크롤 영역 밖으로 빠져나감 → `.table-scroll { position: relative }`
- 가져오기 검증표의 '검증' 열이 카드 밖으로 밀림 → 표 최소 폭 해제

## 3. Theme 7 상태
deep-navy · midnight-slate · forest-emerald · sage-evergreen · ocean-teal · charcoal-graphite · pure-white — 모두 렌더링 확인(Shell 색상 검사 + pure-white 스크린샷 육안 확인). Reduced motion(OS + 설정) 적용.

## 4. KNOWN ISSUES
| # | 내용 | 영향 |
|---|---|---|
| K-1 | 창 높이 약 880px 미만이면 Mobile frame이 비율 축소 표시 (내부 viewport 390 유지) | 시각적, 기능 영향 없음 |
| K-2 | ~~연속 동작 시 Toast 여러 개 쌓임~~ → 같은 문구 병합·최대 3개 (PASS 2) | 해결 |
| K-3 | Demo seed로 열린 Rule Action 다수(약 11건), B2B·수출 추세 음수 | Demo 한정 |
| K-4 | 구성원 초대: Live 실검증 전 (Supabase 초대 메일·Redirect URL 설정 필요) | Live 운영 시 확인 필요 |
| K-5 | `npm audit` next 15.x 내장 postcss 2건 (빌드 경로) — 수정은 Next 16 메이저 | R-10 |
| K-6 | Demo seed 고객 이벤트의 세션이 분산돼 주간 REVENUE 전환율이 0%로 보일 수 있음 | Demo 한정 |

## 5. Score (자체 평가, 근거 포함)
- Strategy Fit: 8.5/10 — Baseline Lock·주간 리포트로 Evidence 운영 루프 완성. 실제 Baseline·AX OWNER 값이 없어 감점
- Product Readiness: 8/10 — DB·RLS를 실제 Postgres에서 검증, Live 결함 1건 선제 수정. 실제 Supabase 연결 미검증으로 감점
- P0 잔여: 없음 (Demo + 로컬 DB 기준). Live 전환 직후 P0 후보 = 실제 Supabase에서 anon 이벤트·초대 메일 확인

## 6. Red Team
- Demo 숫자가 실적처럼 보이는가 → 모든 화면 DEMO 배지·"Demo" 제품명, Baseline "REQUIRED / UNKNOWN"
- 허위 사실 → 평점·리뷰수·효능·인증·특허 표기 제거, 기술자산 "미확인"
- Live에서 Demo 섞임 → DataSource 분리, 실패 시 Error State (코드 검토로 확인, 실행 NOT VERIFIED)
- 키 노출 → 클라이언트는 anon key만, service role 미사용

## 7. Five Devil Questions
1. **이게 없으면 가연인터내셔널이 실제로 손해 보는가?** — 재고 품절·과잉 판단과 고객 관심 변화를 엑셀·감으로 늦게 안다. Pilot은 이 판단을 주 단위→일 단위로 당기는 것이 목적. 단, 손해 규모는 Baseline이 없어 **UNKNOWN**.
2. **대표가 매주 실제로 열 이유가 있는가?** — 오늘의 Mission 3개 + Money KPI 3 + 확정 Proof. 데이터 입력이 멈추면 가치가 0이 되므로 AX OWNER 지정이 전제.
3. **Demo를 걷어내도 작동하는가?** — DB 계층은 실제 Postgres에서 55개 시나리오로 검증했고, 그 과정에서 Live 고객 이벤트가 막히는 결함을 찾아 고쳤다. 실제 Supabase 연결(Auth·Realtime·메일)은 아직 NOT VERIFIED.
4. **AI라고 부를 근거는?** — 현재 RULE/STATISTICAL. 화면에 방법을 명시했고 LLM은 READY로만 표시. 과장하지 않음.
5. **증빙이 외부(정부과제·투자)에서 통하는가?** — Action 이력·KPI before/after·OWNER 확정 Proof, 이력이 보존되는 Baseline, 매주 같은 계산의 주간 리포트(PDF)가 남는다. 단 실제 Baseline 값과 표본이 쌓이기 전에는 효과 주장 불가.
