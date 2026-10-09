# PROJECT_STATE — MIRYEO K-Beauty Growth AX

LAST UPDATED: 2026-10-09 (PASS 9 — 작업 데이터 백업·이관, 사업화 자료 기간 선택)
DELIVERY STAGE: 계약 제11조 2단계 개발 완료(1차 보고·5영업일 확인 대기) + **3단계 일부 개발 착수**(사용자 지시 2026-10-09: "3단계도 일부 개발, Supabase는 나중에 연동")
CURRENT PASS: 9 — 3단계 계속(Supabase 연결 전). Demo 주소에 넣은 실데이터를 백업 파일로 받아 두고 Live 전환 후 그대로 이관(중복 없음), 사업화 실적 자료 기간(최근 12개월·올해·작년). **push = Production 배포**(D-040)

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

완료·검수 기준 중 남은 것: **MVP 시험버전 공개 + 1차 완료 보고 전달**
- **공개 주소(DEMO) 있음**: https://gayeon-miryeo-kbeauty-growth-ax.vercel.app — Vercel이 push마다 자동 배포 (2026-10-07 확인, 전 화면 200). Live 시험버전은 USER ACTION(Supabase·환경변수) 후 같은 주소에서 전환
- Demo 주소를 시험버전으로 먼저 보고할지, Live 전환 후 보고할지는 **사용자 결정** (보고서 초안에 두 경우 모두 표기)
계약 2단계 중 개발 외 결과물(특허기술자료, 벤처/기업정비 기초자료)은 이 저장소 범위 밖.

## 계약 별지 제2호 3단계 대조 (2026-10-09)
3단계 산출물: "실제 자료 적용·기능 보완, 벤처 신청/보완, 정책자금·보증용 사업화자료, 담당자 면담/현장확인 대비" (별지 제1호: "실제 자료 **또는 합리적인 샘플 자료**로 실제 업무에 쓸 수 있는지 확인")
| 산출물 | 개발 부분 | 상태 | 남은 것 (막힌 이유) |
|---|---|---|---|
| 실제 자료 적용 | 판매 파일 하나로 시작: 미등록 상품·채널 즉시 등록(추정값 확인) + 자료 진단 + **Demo에서 입력한 실데이터 백업·Live 이관** | PILOT — Demo·Live E2E VERIFIED | 실제 판매·상품 엑셀 (USER), Live 전환 (USER: Supabase) |
| 기능 보완 | 위 + 실데이터 시작 가이드·주간 운영 점검·공개 전 점검(PASS 5~6) | PILOT | 실사용 피드백 (Live 이후) |
| 정책자금·보증용 사업화자료 | 사업화 실적 자료 — 기록만 집계(매출 추이·채널·B2B·수출·제품·고객 반응·AX 운영·출처), 인쇄/PDF·근거 CSV, Demo는 '제출 불가' | PILOT | 실데이터 (USER). 신청서 본문·재무·회사 개요는 개발 범위 밖 |
| 벤처 신청/보완 | 사업화 실적 자료 + 기술자산 상태 + 현장확인 Q&A(특허·기술은 '대표 답변 준비') | 일부 | 특허기술자료·신청서 (개발 범위 밖) |
| 담당자 면담/현장확인 대비 | 하루 전 점검·시연 순서 7단계(현재 근거 표시)·예상 질문 7개(시스템 사실만) | PILOT | 실데이터로 리허설 (Live 이후) |

## PASS 9 변경 요약 (2026-10-09)
| 항목 | 상태 |
|---|---|
| 작업 데이터 백업·이관 (데이터 관리 > 내보내기): 실데이터만(채널·상품·재고·판매·정산·Pilot 시작일·AX OWNER) JSON 백업 → Demo 복원 또는 Live 이관. 같은 SKU·채널명·정산·판매는 건너뜀(여러 번 가져와도 중복 없음), 기존 값 덮어쓰지 않음, 비UUID ID는 새 UUID. 고객 개인정보·행동·Action/Proof·Baseline 제외. 받기=대표·관리자, 가져오기=대표 | Demo VERIFIED (24/24) · Live VERIFIED (Demo 파일 → Live 이관·재가져오기 무변화) |
| 파일 검사: JSON·종류·버전, 항목별 형식(카테고리·날짜·수량·참조), 20만 행·50MB 상한, `javascript:` 링크 제거, 이름의 HTML은 글자로만 | VERIFIED |
| Demo 실데이터 백업 안내 배너 (데이터 관리) | VERIFIED |
| 사업화 실적 자료 기간: 최근 12개월·올해·작년 (CSV 파일명에 기간) | VERIFIED |
| 결함 수정: 판매 파일에서 등록하는 상품·채널 ID가 보안 컨텍스트가 아니면(사내 http 주소) UUID가 아니어서 Live 저장 실패 가능 → 항상 UUID | FIXED |

## PASS 8 변경 요약 (2026-10-09)
| 항목 | 상태 |
|---|---|
| 판매 파일 가져오기: 파일에만 있는 상품·채널을 그 자리에서 등록 (카테고리=상품명 추정, 판매가=파일 매출÷수량 추정, 채널 유형=채널명 추정 — 모두 '추정' 표시·확인 후 저장, 대표·관리자만), SKU 없으면 AUTO 코드, 등록 후 자동 재검증 | PILOT — Demo VERIFIED, Live VERIFIED(로컬 스택: 실제 인증·RLS) |
| 자료 진단 (파일 그대로 요약: 기간·행·상품·채널·수량·매출·해석 실패·4주 미만 경고) | Demo VERIFIED |
| 사업화 실적 자료 `/ax/business` (대표·관리자) — 최근 12개월, 증감은 **완료된 달만** 비교, Live는 Demo 표시 상품·시드 제외, 평가·전망 문장 없음 | Demo·Live VERIFIED |
| 면담·현장확인 대비 `/ax/business?tab=inspection` — Demo에서는 '현장확인에 Demo 숫자 사용 금지' 경고 | Demo·Live VERIFIED |
| 보안: Next.js 16.3.7 → **16.4.0** (high 6건: 이미지 최적화 SSRF·캐시 오염 등), 하한 `^16.4.0` | FIXED — audit 0, 전체 회귀 재실행 |
| 결함 수정: 판매 가져오기 검증이 새 채널 등록에 반응하지 않음(의존성 누락) | FIXED |
| 결함 수정(접근성, 잠복): 채널 도넛 조각이 이름 없는 이미지·빈 탭 정지점 — 이전 '0건'은 차트가 그려지기 전 검사 결과. 도넛 숨김(옆 목록이 같은 정보 제공)·탭 정지 제거, 검사는 차트 렌더 후 | FIXED + VERIFIED (28화면 0건) |

## PASS 7 변경 요약 (2026-10-07)
| 항목 | 상태 |
|---|---|
| 배포 상태 확인: Vercel 프로젝트 연결, 기본 브랜치 push마다 Production 자동 배포, 공개 주소 https://gayeon-miryeo-kbeauty-growth-ax.vercel.app = DEMO 모드·최신 커밋, 배포별 주소는 Vercel 로그인 보호 | VERIFIED (GitHub deployments API + curl) |
| 공개 주소 HTTP 점검: 23개 경로 200·DEMO 표기, AI 브리핑 POST → 503 AI_DISABLED(비용 없음), HSTS 있음 | VERIFIED |
| 결함(공개 사이트): 검색 노출 제어 없음(robots 404·noindex 없음), 보안 헤더 없음(nosniff·Referrer·Permissions·클릭재킹 차단) → D-039 | FIXED + 배포 확인 (커밋 5e02e0b, 공개 주소에서 robots·헤더 6종·noindex 확인) |
| 결함: 저장한 테마·글자 크기·모션 줄이기가 hydration 후에야 적용 → 매 진입 시 기본 테마 깜빡임, 모션 줄이기 사용자에게 첫 애니메이션 재생 → D-041 | FIXED + VERIFIED (JS 차단 상태에서도 첫 화면에 적용 3종·hydration 후 기본값으로 바뀌는 순간 없음) |
| 공개 주소 브라우저 자동 테스트 | NOT RUN — 작업 환경 프록시 인증서를 브라우저가 신뢰하지 않음. 인증서 검증 우회는 하지 않음. 같은 커밋의 로컬 빌드로 대신 검증 |

## PASS 6 변경 요약 (2026-10-07)
| 항목 | 상태 |
|---|---|
| 공개 전 점검 `/ax/system` (대표·관리자) — 연결·HTTPS, migration 001·005·006·007 설치, 익명 노출(RLS) 8개 테이블·비공개 상품, 고객 화면 조직 ID·공개 상품·구매 링크·처리방침, 관리 키 유효성, AI 설정 일치, 직접 확인 3항목, 조직 ID 복사 | PILOT — Demo VERIFIED, 로컬 Live VERIFIED(정상 판정 + RLS 해제 시 노출 탐지) |
| `/api/system/status` — 서버 설정 참/거짓만, Live는 대표·관리자, 비로그인 401 | VERIFIED (로컬 Live) |
| Supabase 일괄 설치 `supabase/setup_all.sql` (`npm run setup-sql`) — 한 트랜잭션, 004 제외 | VERIFIED — verify:db가 최신 여부·개별 적용과 스키마 동일(128 CREATE) 확인 |
| 주간 운영 점검 6항목 (판매 7일·재고 7일·미검토 Action 3일·진행 지연 14일·미확정 Proof·연체 미수금) — 시작 가이드 하단, 주간 리포트(인쇄), 가이드 완료 후 대시보드 배너 | PILOT (Demo VERIFIED) |
| 서버 인증 공통화 `src/lib/server/auth.ts` (AI 브리핑·점검 API) | 회귀 통과 |

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
| 데이터 관리 | PILOT | 단건 + 파일(CSV/XLSX, 열 매핑·검증·중복 감지, 자료 진단, 미등록 상품·채널 즉시 등록), 샘플 템플릿 `public/samples/` |
| 실증·Evidence | PILOT | Money KPI 3 + Baseline Lock·대비 변화, Proof 확정/반려, 수동 Proof, 12주 계획 |
| 주간 Evidence 리포트 | PILOT | `/ax/reports/weekly`, 인쇄·PDF |
| 설정 | PILOT | 7 Theme·글자·모션·역할매트릭스·Demo Reset·Pilot 시작일·AX OWNER·AI 상태·기술자산·구성원 |
| 도입 배경(Why) | DEMO→설명 | 문서형 |
| 실데이터 시작 가이드 | PILOT | `/ax/start`, 13단계 자동 판정 + 매주 운영 점검 6항목 |
| 공개 전 점검 | PILOT | `/ax/system`, Live에서 DB·RLS·설정 자동 점검 |
| 사업화·현장확인 | PILOT | `/ax/business` — 사업화 실적 자료(인쇄·CSV) / 면담·현장확인 대비 (대표·관리자) |
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
- 2026-10-09 (PASS 9): typecheck / build PASS, Route QA 33×8 이상 0, Demo Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, 접근성 28화면 0건(차트 렌더 후), Live E2E 77/77 → `QA_REPORT.md`

## 8. USER ACTION QUEUE
| # | 구분 | 작업 | 상태 |
|---|---|---|---|
| 1 | SUPABASE | Project 생성 | WAITING |
| 2 | SUPABASE | 새 프로젝트: **`supabase/setup_all.sql` 1회 실행** (또는 001→002→003→005→006→007 개별, 004 선택) | WAITING |
| 3 | SUPABASE | OWNER 계정 생성 → `/login` → 조직 만들기 | WAITING |
| 4 | ENV | `NEXT_PUBLIC_DATA_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | WAITING |
| 5 | ENV | `NEXT_PUBLIC_MIRYEO_ORG_ID` (조직 생성 후) | WAITING |
| 6 | VERCEL | 환경변수 반영 + Redeploy (프로젝트·자동 배포는 이미 연결됨 — DEMO 운영 중) | WAITING |
| 6-0 | CHECK | 재배포 후 대표 계정으로 `/ax/system` → "공개 가능 — 문제 없음" | WAITING |
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
1. (USER ACTION 1~6 완료 시) **실제 Supabase 연결 확인**: `/ax/system` 점검 결과 확인 → `e2e.mjs`와 같은 순서로 1회 (특히 Realtime, 초대·가입 메일 Redirect URL)
2. 실제 판매·상품 엑셀 수령 → 데이터 관리에 그대로 올려 자료 진단·미등록 상품 등록 확인 → 열 별칭 보강 (Week 0). Demo 주소에서도 미리 시험 가능(이 브라우저에만 저장)
2-0. Demo 주소에 실데이터를 넣었다면 **백업 파일을 주기적으로 받기** (브라우저에만 저장) → Live 전환 직후 대표 계정으로 데이터 관리 > 내보내기 > 백업 파일 가져오기
2-1. 실데이터가 들어오면 사업화 실적 자료·현장확인 가이드를 실제 숫자로 리허설 (3단계 완료 근거)
3. 고객 화면 공개 준비: 실제 제품 정보·구매 링크 확인, 봇 방지(R-14) 필요성 판단
4. Week 1~4 운영 지원: 주간 운영 점검 6항목 기준값을 실제 입력 주기에 맞게 조정(`ROUTINE_RULES`), 운영 점검 알림(R-17) 필요성 판단
5. (승인 시) AI 문장화 켜기 + 실호출 1회 확인 — D-034
