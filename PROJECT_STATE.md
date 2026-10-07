# PROJECT_STATE — MIRYEO K-Beauty Growth AX

LAST UPDATED: 2026-10-07 (PASS 5 — 실데이터 시작 가이드·AI 문장화 준비·접근성·1차 보고서 초안)
DELIVERY STAGE: 계약 제11조 2단계 — 6개 핵심기능 초기버전 개발 완료, 시험버전 공개(URL)·1차 보고 대기
CURRENT PASS: 5 — 실데이터 시작 가이드(`/ax/start`), 대표 브리핑 AI 문장화(Claude, 기본 꺼짐·READY), 접근성(WCAG 2.1 A/AA 자동 점검 0건), 1차 보고서 초안(`STAGE2_DELIVERY_REPORT.md`). 실제 Supabase 연결은 USER ACTION 대기

## 계약 별지 제1호 대조 (2026-09-30 기준)
| No | 핵심모듈 | 구현 | 화면 |
|---|---|---|---|
| 1 | 통합 경영 현황판 — 월별·채널별·제품별 매출, 이익, 재고, 받을 돈, 수출, B2B | ✅ 대시보드(4주 KPI + 이번 달 매출·매출총이익·받을 돈) + 월별 실적(12개월·채널별·제품별) | `/ax`, `/ax/monthly` |
| 2 | 제품별 재고·생산 분석 — 원가·판매가·이익·재고·판매속도·소진일·OEM | ✅ (OEM 생산기간은 생산계획 입고예정일로 관리, 발주량 계산에는 미반영) | `/ax/products` |
| 3 | 판매채널·B2B·수출 성과관리 — 실적 비교, 거래처·납품·정산 상태 | ✅ 채널 분석·B2B·수출 + 정산·미수금(청구·부분입금·연체) | `/ax/channels` |
| 4 | AI 성장 실행센터 — 행동 제안 + 대표자용 요약 | ✅ RULE 행동추천·Action 생애주기 + 대표 브리핑(RULE 요약). Claude 문장화 구현·숫자 검증 포함, 기본 꺼짐(READY — 고객사 승인·API 키) | `/ax/growth`, `/ax` |
| 5 | AI 제품·사용순서 추천 → 구매 결정 | ✅ Finder → 루틴 → 제품 상세 → 구매처 이동 | `/beauty/finder` |
| 6 | 고객 뷰티 기록·회원·재구매 — 고객계정·마이페이지·추천결과·구매이력·재구매 예상시점 | ✅ 회원가입(필수/선택 동의 분리)·마이페이지·추천 기록(가입 전 기록 연결)·구매 기록(고객/운영자)·재구매 예상일·탈퇴 | `/beauty/login`, `/beauty/me`, `/ax/customers#members` |

제5조 기본기능: 로그인·권한 ✅ · 검색·필터·등록·수정·조회·이력 ✅ · 반응형 ✅ · CSV·엑셀 입력 ✅ **및 내보내기 ✅**(`/ax/data?tab=export`) · AI 흐름 ✅ · 대표자 브리핑 ✅ · 추천→구매 흐름 ✅

완료·검수 기준 중 남은 것: **MVP 시험버전 공개 + 1차 완료 보고 전달** (USER ACTION: Supabase·Vercel 설정 → 공개 URL)
계약 2단계 중 개발 외 결과물(특허기술자료, 벤처/기업정비 기초자료)은 이 저장소 범위 밖.

## PASS 5 변경 요약 (2026-10-07)
| 항목 | 상태 |
|---|---|
| 실데이터 시작 가이드 `/ax/start` — Week 0~4 13단계 자동 판정(Demo 시드 제외), 대시보드 진행 배너(OWNER/ADMIN) | PILOT (Demo VERIFIED) |
| 대표 브리핑 AI 문장화 — `/api/ai/briefing`(서버 전용 키, OWNER/ADMIN, 시간당 20회, 입력은 RULE 문장만·개인정보 없음), 기록에 없는 숫자·거절 시 폐기하고 RULE 요약 유지 | READY (기본 꺼짐) — 가짜 API 서버로 11/11 VERIFIED, 실제 API NOT VERIFIED |
| 접근성 — axe-core WCAG 2.1 A/AA 25개 화면 × PC(1440)·모바일(390) | 위반 0건 (대비 토큰 `--success`·`--warning`·`--b-gold-ink`, 표 스크롤 키보드 접근, 버튼 이름) |
| 1차 완료 보고서 초안 | `STAGE2_DELIVERY_REPORT.md` — `[ ]` 칸(보고일·공개 URL·계정) 채워 발송 |
| 의존성 보안 업데이트 (sharp, source-map-js — npm audit 0건) | 전체 회귀 통과 |

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
| 실데이터 시작 가이드 | PILOT | `/ax/start`, 13단계 자동 판정 |
| AI 요약(LLM) | READY | 대표 브리핑 Claude 문장화 구현·기본 꺼짐 (D-012, D-034) |

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
- 2026-10-07: typecheck / build PASS, Route QA 30×8 이상 0, Demo 31/31 · PASS2 33/33 · PASS3 11/11 · Stage2 41/41 · AI 11/11, 접근성 0건, Live E2E 62/62, DB 97/97, npm audit 0 → `QA_REPORT.md`

## 8. USER ACTION QUEUE
| # | 구분 | 작업 | 상태 |
|---|---|---|---|
| 1 | SUPABASE | Project 생성 | WAITING |
| 2 | SUPABASE | migration 001→002→003→**005→006→007** 실행 (004 선택) | WAITING |
| 3 | SUPABASE | OWNER 계정 생성 → `/login` → 조직 만들기 | WAITING |
| 4 | ENV | `NEXT_PUBLIC_DATA_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | WAITING |
| 5 | ENV | `NEXT_PUBLIC_MIRYEO_ORG_ID` (조직 생성 후) | WAITING |
| 6 | VERCEL | 환경변수 반영 + Redeploy | WAITING |
| 6-1 | ENV (선택) | `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 앱 내 초대용) + Supabase Redirect URL에 `/login` 추가 | WAITING |
| 7 | DATA | 실제 상품 1~2개, 재고, 판매 샘플, 구매 링크 | WAITING |
| 8 | DATA | Pilot 시작일 + Money KPI 3 Baseline 잠금 (실측·자기기록 값) | WAITING |
| 8-1 | DATA | 실제 판매 엑셀 샘플 1개 (열 이름 별칭 보강용) | WAITING |
| 8-2 | LEGAL | **고객 개인정보 처리방침 URL·버전 확정** → `NEXT_PUBLIC_PRIVACY_POLICY_URL`, `NEXT_PUBLIC_PRIVACY_VERSION` (없으면 Live 회원가입 비활성), 별지 제6호 적용 여부 | WAITING |
| 8-3 | DATA | 제품별 사용기간(일) — 재구매 예상일 정확도 (미입력 시 종류별 추정) | WAITING |
| 8-4 | DATA | 거래처별 청구·입금 현황 (미수금 초기값) | WAITING |
| 9 | PEOPLE | AX OWNER 지정, ADMIN/STAFF 계정 목록 | WAITING |
| 9-1 | DECISION | 대표 브리핑 AI 문장화 사용 여부 (외부 AI 사용료 고객사 부담, 계약 제16조) → 사용 시 `ANTHROPIC_API_KEY`(서버 전용)·`AI_BRIEFING_ENABLED=true`·`NEXT_PUBLIC_AI_BRIEFING=on` | WAITING |
| 9-2 | REPORT | `STAGE2_DELIVERY_REPORT.md`의 `[ ]` 칸 확인 후 발송 (공개 URL 확보 후) | WAITING |
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
- AI 문장화는 실제 Anthropic API로 호출해 본 적 없음 (가짜 서버로 요청 형식·검증·거절 처리만 확인). 켜는 날 1회 실호출 확인 필요
- AI 사용 한도(시간당 20회)는 서버 인스턴스 메모리 기준 — 서버리스 인스턴스가 여러 개면 합산되지 않음

## 10. NEXT PRIORITY
0. **시험버전 공개 + 1차 완료 보고** (계약 제12조: 보고 후 5영업일 이의 없으면 2단계 진행 확인) — USER ACTION 1~6 후 공개 URL을 `STAGE2_DELIVERY_REPORT.md`에 채워 발송
1. (USER ACTION 1~6 완료 시) **실제 Supabase 연결 확인**: `e2e.mjs`와 같은 순서로 1회 (특히 Realtime, 초대·가입 메일 Redirect URL)
2. 실제 판매·상품 엑셀 수령 → 열 별칭 보강 → 첫 실데이터 입력 지원 (Week 0)
3. 고객 화면 공개 준비: 실제 제품 정보·구매 링크 확인, 봇 방지(R-14) 필요성 판단
4. Week 1~4 운영 지원: 주간 리포트 기반 점검 루틴
5. (승인 시) AI 문장화 켜기 + 실호출 1회 확인 — D-034
