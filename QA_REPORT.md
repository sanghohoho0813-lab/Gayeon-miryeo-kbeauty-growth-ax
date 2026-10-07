# QA_REPORT — MIRYEO K-Beauty Growth AX (PASS 7)

DATE: 2026-10-07 · Next.js 16.3.7 · MODE TESTED: DEMO + LIVE(로컬 Supabase 호환 스택) · BROWSER: Chromium (Playwright)

## 1. Release Gate
| 항목 | 결과 |
|---|---|
| `npm run typecheck` (tsc --noEmit) | PASS |
| `npm run build` (Next 16, Turbopack) | PASS |
| `npm audit` | 0 vulnerabilities (2026-10-07 공개된 sharp·source-map-js high 2건 → `npm audit fix`로 해소, 전체 회귀 재실행) |
| **Live E2E** `supabase/tests/live-e2e/run.sh` (Supabase Auth 실서버 + 호환 게이트웨이 + 실제 RLS) | **PASS 68/68** (A 7 + B 61 — 공개 전 점검 정상 판정, 판매 RLS 해제 시 노출 탐지, 점검 API 권한·키 값 미포함 포함) |
| **PASS 7** 화면 설정 첫 화면 적용 `qa-boot` (JS 차단 상태 3종 + hydration 중 기본 테마 없음 + 설정 변경) | PASS 5/5 |
| 보안 헤더·robots (Demo 로컬 + 환경변수 3조합 규칙 평가) | PASS |
| **PASS 6 Demo** (공개 전 점검 Demo 판정·권한·API, 주간 운영 점검 시드 제외·실입력 정상·지연 탐지·주간 리포트·배너) | PASS 19/19 |
| **접근성** axe-core WCAG 2.1 A/AA — 26개 화면 × 1440·390px (reduced motion) | **PASS 0건** (수정 전 4종: 대비·버튼 이름·라벨 불일치·스크롤 영역 키보드) |
| **AI 브리핑** (가짜 Anthropic 서버 :4010) — 요청 형식(모델·effort·fallbacks·beta 헤더)·시스템 규칙·개인정보 미포함·근거 없는 숫자 폐기·거절 처리·직원 차단·임의 입력 거부 | PASS 11/11 |
| AI 꺼짐(기본 빌드) `POST /api/ai/briefing` | 503 AI_DISABLED (호출 없음) |
| 2단계 보완 Demo Flow (회원·마이페이지·재구매·정산·월별·브리핑·내보내기·권한·탈퇴) | PASS 41/41 |
| PASS 3 Demo Flow (상품 일괄 등록·권한) | PASS 11/11 |
| Route QA: 31 route(`/ax/start`·`/ax/system` 추가) × 8 viewport (1920/1440/1280/1024/768/430/390/360) — 가로 overflow, console error, HTTP error | PASS (0건) |
| Whole-App Acceptance Flow (PASS 1 회귀) | PASS 31/31 |
| PASS 2 Flow (Baseline·주간 리포트·PDF·파일 가져오기·구성원·권한) | PASS 33/33 |
| DB 검증 `npm run verify:db` (Postgres 16 + Supabase auth stub): migration 001~007, RLS·트리거·이벤트 한도·고객/정산 97개 시나리오, 005~007 재실행 | PASS 97/97 |
| `supabase/setup_all.sql` 최신 여부 + 새 DB 한 번에 적용 → 개별 migration 결과와 스키마 비교 | 동일 (CREATE 128) |
| Import 로직 단위 테스트 (열 자동 인식, 날짜 9종, 금액, 중복) | PASS 6/6 |
| 클라이언트 번들에 service role 키 값·서버 코드 포함 여부 | 없음 (안내 문구의 변수 이름만) |
| 실제 Supabase 프로젝트(호스팅) 연결 | **NOT VERIFIED** — 자격증명 없음. 로컬 호환 스택에서는 VERIFIED |
| Realtime (postgres_changes) | **NOT VERIFIED** — 로컬 스택에 Realtime 서버 없음 (브라우저 콘솔에 WebSocket 실패 로그가 남는 것은 이 때문) |
| 실기기(iOS/Android) | NOT VERIFIED |
| Screen reader | NOT VERIFIED (자동 점검 0건, 실제 낭독 순서 미확인 — R-16) |
| 실제 Anthropic API 호출 | **NOT VERIFIED** — 키 없음(기본 꺼짐). 켜는 날 1회 확인 |

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

### Live E2E 45단계 (로컬 스택, 모두 PASS)
A: 대표 계정 생성 / 비로그인 → /login / 잘못된 비밀번호 안내 / 조직 없는 계정 → 조직 만들기 / 조직 생성 → DB·OWNER / Live 빈 상태(Demo 없음) / Page error 0
B: 재로그인 / 채널 저장 / 상품 저장(공개·구매링크) / 상품 일괄 등록(신규·부분 수정) / 판매 파일 8행 인식·저장 / 재고 위험 RULE → Action 생성·이력 / Baseline 잠금(RPC) / Action DONE·승인자·KPI before/after·이력 / Proof(SUPABASE LIVE) / OWNER 확정 / Baseline 대비 변화 / Pilot 시작일·AX OWNER / 고객 홈 실상품 / 구매처 새 창 / 익명 이벤트 5종 / 구매채널 이벤트 / Finder 결과 저장(익명) / AX 고객 인사이트 반영 / 구성원 목록(서버 API) / 초대 2명 / 초대 메일 / 초대 수락·비밀번호·진입 / STAFF 메뉴 / STAFF 버튼 / STAFF 토큰 RLS(판매 O·B2B 0행) / STAFF 구성원 차단 / ADMIN 메뉴 / ADMIN 구성원 조회·초대 폼 없음 / ADMIN API 초대 403 / 역할 변경 / 제거(계정 유지) / 주간 리포트(LIVE) / 장애 중 재시도 안내·잘못된 역할 표시 없음 / 장애 → Error 화면(Demo 없음) / Page error 0

### PASS 5에서 발견·수정한 결함
- 접근성: 상태 색(성공·주의)·금색 글자 대비 부족 → 토큰 조정(D-035), 아이콘만 있는 역할 버튼 이름 없음 → 숨김 텍스트, 알림 벨 라벨이 보이는 숫자와 불일치 → 수정, 가로 스크롤 표 키보드 접근 불가 → `tabIndex=0` 15곳
- 테스트 환경: 시험용 XLSX 날짜 고정값 → 실행일 기준으로 재생성. playwright-core는 설치된 Chromium 1194에 맞춰 1.56 고정(SETUP §E)

### PASS 7 — 공개 주소 점검·발견 결함
- 공개 주소(DEMO) `curl` 점검: 23개 경로 200·DEMO 표기·런타임 오류 문구 없음, AI 브리핑 POST 503(꺼짐), HSTS 있음. 배포 전: robots 404·noindex 없음·보안 헤더 없음 → D-039로 수정
- 배포 후 확인 (커밋 5e02e0b, Vercel 배포 success): 공개 주소 robots `Disallow: /`, `x-robots-tag: noindex`, nosniff·Referrer·Permissions·X-Frame-Options·CSP frame-ancestors·HSTS, `x-powered-by` 없음, 첫 화면 설정 스크립트 포함, 22개 화면 200·오류 0
- 브라우저 자동 테스트는 공개 주소에 직접 실행하지 않음: 작업 환경 프록시의 가로채기 인증서(2026-08)가 브라우저 인증서 저장소에 없음. 인증서 검증을 끄는 우회는 하지 않고, 같은 커밋의 로컬 빌드로 전체 회귀 + 배포 후 `curl` 확인
- **결함 (UX·접근성)**: 저장한 테마·글자 크기·모션 줄이기가 hydration 후에 적용 → 기본 테마 깜빡임·첫 애니메이션 재생. 7 Theme 비교 테스트가 30/31로 실패하며 드러남(5번째 테마가 기본 네이비로 측정). 첫 화면 전 스크립트로 수정(D-041), 새 테스트 `qa-boot` 5/5 — JS 번들을 막아도 저장 설정이 첫 화면에 적용, hydration 중 기본 테마로 바뀌는 순간 없음(속성 변경 기록 `deep-teal → deep-teal`)

### PASS 6에서 발견·수정한 결함
- `/ax/system` 390·430px 가로 넘침: 긴 환경변수 이름(끊을 곳 없는 문자열)이 줄바꿈되지 않음 → `break-any` (화면 폭 점검으로 발견)
- 테스트 간헐 실패 정정: PASS 5에서 Acceptance Flow의 Dual 화면 새로고침 멈춤을 "도구 버전 불일치"로 기록했으나 **틀린 원인**이었음. 1.56에서도 재발. Chromium은 두 frame 모두 networkIdle을 보고(약 4초)하는데 새로고침 중 새로 붙는 Mobile iframe 때문에 Playwright의 networkidle 판정이 간헐적으로 끝나지 않음(앱 요청은 2초 안에 모두 종료 — CDP lifecycle로 확인). 이 단계의 검증 대상은 'Dual 유지'이므로 `load` + 요소 대기로 변경, 3회 연속 31/31

### 2단계 보완에서 발견·수정한 결함
- Demo 판매 시드가 주 1회 집계 행이라 월별 합계가 그 달에 든 주 수에 따라 출렁임(전월 대비 +77% 같은 가짜 추세) → 일반 채널은 일 단위 행으로 분할 (주간 분석 값은 동일)
- 한글 CSV 파일명이 일부 브라우저에서 `download`로 바뀜 → 영문 파일명(`miryeo_*`)
- 고객 인사이트 360~430px 가로 넘침 (새 회원 패널 그리드) → 열 폭 고정
- 날짜 함수가 시각이 붙은 날짜 문자열에서 실패 → 앞 10자만 사용하도록 보강 (로컬 게이트웨이도 PostgREST와 같은 `YYYY-MM-DD` 반환으로 수정)

### PASS 3에서 발견·수정한 결함 (Live E2E)
- **P0**: 익명 고객 Finder 결과 저장 실패 — `insert().select()`는 결과 조회 권한이 필요한데 익명 고객은 없음. 클라이언트 생성 id + RETURNING 없이 저장.
- **P1**: 역할 확인 전 기본값 STAFF 노출 → 대표가 '직원'으로 표시, 메뉴 깜빡임. `roleReady` 도입.
- **P2**: Live에서 구매 링크 미등록 안내에 'Demo' 문구. 모드별 문구로 수정.
- 관찰: DB 장애 시 supabase-js 자동 재시도로 오류 화면까지 약 15초 → 5초 후 재시도 안내 표시.

## 3. Theme 7 상태
deep-navy · midnight-slate · forest-emerald · sage-evergreen · ocean-teal · charcoal-graphite · pure-white — 모두 렌더링 확인(Shell 색상 검사 + pure-white 스크린샷 육안 확인). Reduced motion(OS + 설정) 적용.

## 4. KNOWN ISSUES
| # | 내용 | 영향 |
|---|---|---|
| K-1 | 창 높이 약 880px 미만이면 Mobile frame이 비율 축소 표시 (내부 viewport 390 유지) | 시각적, 기능 영향 없음 |
| K-2 | ~~연속 동작 시 Toast 여러 개 쌓임~~ → 같은 문구 병합·최대 3개 (PASS 2) | 해결 |
| K-3 | Demo seed로 열린 Rule Action 다수(약 11건), B2B·수출 추세 음수 | Demo 한정 |
| K-4 | 구성원 초대: Live 실검증 전 (Supabase 초대 메일·Redirect URL 설정 필요) | Live 운영 시 확인 필요 |
| K-5 | ~~`npm audit` next 15.x postcss~~ → Next 16 업그레이드로 해소 | 해결 |
| K-7 | 로컬 Live 검증은 PostgREST 호환 게이트웨이 사용 (PostgREST 자체 아님), Realtime 미포함 | 실제 Supabase에서 1회 재확인 |
| K-8 | AI 사용 한도(시간당 20회)는 서버 인스턴스 메모리 기준 — 서버리스 다중 인스턴스에서는 합산되지 않음 | AI를 켠 뒤 사용량 보고 판단 (R-15) |
| K-6 | Demo seed 고객 이벤트의 세션이 분산돼 주간 REVENUE 전환율이 0%로 보일 수 있음 | Demo 한정 |

## 5. Score (자체 평가, 근거 포함)
- Strategy Fit: 8.5/10 — Baseline Lock·주간 리포트로 Evidence 운영 루프 완성. 실제 Baseline·AX OWNER 값이 없어 감점
- Product Readiness: 8.5/10 — Live 경로를 실제 인증 서버·RLS 위에서 브라우저로 검증하며 Live 결함 3건을 선제 수정. 실제 Supabase·Realtime 미검증으로 감점
- P0 잔여: 없음 (Demo + 로컬 Live 스택 기준). 실제 Supabase 연결 직후 확인 항목 = Realtime, 초대 메일 Redirect URL

## 6. Red Team
- Demo 숫자가 실적처럼 보이는가 → 모든 화면 DEMO 배지·"Demo" 제품명, Baseline "REQUIRED / UNKNOWN"
- 허위 사실 → 평점·리뷰수·효능·인증·특허 표기 제거, 기술자산 "미확인"
- Live에서 Demo 섞임 → DataSource 분리, 실패 시 Error State (코드 검토로 확인, 실행 NOT VERIFIED)
- 키 노출 → 클라이언트는 anon key만, service role 미사용

## 7. Five Devil Questions
1. **이게 없으면 가연인터내셔널이 실제로 손해 보는가?** — 재고 품절·과잉 판단과 고객 관심 변화를 엑셀·감으로 늦게 안다. Pilot은 이 판단을 주 단위→일 단위로 당기는 것이 목적. 단, 손해 규모는 Baseline이 없어 **UNKNOWN**.
2. **대표가 매주 실제로 열 이유가 있는가?** — 오늘의 Mission 3개 + Money KPI 3 + 확정 Proof. 데이터 입력이 멈추면 가치가 0이 되므로 AX OWNER 지정이 전제.
3. **Demo를 걷어내도 작동하는가?** — 로컬 Supabase 호환 스택(실제 Supabase Auth + 실제 RLS)에서 Live 모드로 로그인부터 초대·장애까지 45단계를 브라우저로 통과했고, 그 과정에서 Live 전용 결함 3건을 고쳤다. 남은 불확실성은 실제 호스팅 연결과 Realtime.
4. **AI라고 부를 근거는?** — 현재 RULE/STATISTICAL. 화면에 방법을 명시했고 LLM은 READY로만 표시. 과장하지 않음.
5. **증빙이 외부(정부과제·투자)에서 통하는가?** — Action 이력·KPI before/after·OWNER 확정 Proof, 이력이 보존되는 Baseline, 매주 같은 계산의 주간 리포트(PDF)가 남는다. 단 실제 Baseline 값과 표본이 쌓이기 전에는 효과 주장 불가.
