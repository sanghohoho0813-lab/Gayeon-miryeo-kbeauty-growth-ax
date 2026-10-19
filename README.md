# MIRYEO K-Beauty Growth AX — PILOT

가연인터내셔널 / MIRYEO의 **AX + Customer Platform** 실증 운영 MVP.

```
Customer Event → AX Decision(RULE) → Human Action → Result → Proof Event → Evidence
```

| 영역 | 경로 | 대상 |
|---|---|---|
| MIRYEO Business AX | `/ax` | 대표·관리자·직원 (OWNER / ADMIN / STAFF) |
| MIRYEO AI Beauty | `/beauty` | 고객 (비회원: 익명 세션 / 회원: `/beauty/login`·`/beauty/me`, 동의 기반) |
| 로그인 (Live) | `/login` | 구성원 |
| AX Sprint II 심사 페이지 | `/review/ax-sprint2` | 심사위원 — 공개·읽기 전용·시연 데이터만 (D-068, `AX_SPRINT2_REVIEW_SOURCE.md`) |
| AX Sprint II 소개 영상 | `/review/ax-sprint2/video` (+ 심사 페이지·홈 `/`에 같은 영상) | 담당자·심사위원 — V7 3분 39초(특허출원번호 표시), 세로 9:16·가로 16:9 원본 1080p, 자막·배경음악 포함 (D-069 → V2 D-070 → V3 D-072 → V4 D-074 → V5 D-077 → V6 D-078 → V7 D-079, 제작 원본 `video/ax-sprint2/`) |

## 실행
```bash
npm install
npm run dev          # Demo 모드 (기본)
npm run typecheck
npm run build
npm run verify:db    # (선택) 로컬 Postgres로 migration + RLS·트리거 135개 시나리오 + setup_all.sql 동등성 검증
npm run setup-sql    # migration 수정 후 supabase/setup_all.sql 재생성
bash supabase/tests/live-e2e/run.sh   # (선택) 로컬 Supabase 호환 스택에서 Live 모드 브라우저 E2E (SETUP.md §E)
```
공개 주소(현재 DEMO): https://gayeon-miryeo-kbeauty-growth-ax.vercel.app — 기본 브랜치 push마다 Vercel Production 자동 배포이므로 push 전 전체 회귀 필수(DECISIONS D-040). Live 전환은 **SETUP.md** 참고. 1차 완료 보고서 초안: **STAGE2_DELIVERY_REPORT.md**

## Data Mode (정확한 동작)
- `NEXT_PUBLIC_DATA_MODE=demo` (기본): Demo Seed + 브라우저 저장소. 화면에 DEMO 표시, Demo 초기화 가능.
- `NEXT_PUBLIC_DATA_MODE=live`: **Supabase만** 사용. 비어 있으면 Empty State, 오류면 Error State. **Demo로 자동 fallback 하지 않음.** Supabase 환경변수가 없으면 설정 오류 화면.

## 구조
```
UI (src/app, src/components)
 └ DataProvider / BeautyDataProvider
    └ DataSource 인터페이스 (src/lib/data/source.ts)
       ├ demo-store.ts   (Seed + localStorage, PC/Mobile iframe 동기화)
       └ live-source.ts  (Supabase, RLS)
 └ buildModel (src/lib/model.ts) → analytics.ts (RULE / STATISTICAL)
```
- Schema / RLS: `supabase/migrations/001~011` (005·007·008·009·010·011 필수, 006 고객 화면 공개 전 필수), 검증: `supabase/tests/`
- 월별 실적 `/ax/monthly`, 정산·미수금 `/ax/channels?tab=settlements`, 대표 브리핑 `src/lib/briefing.ts`, 내보내기 `/ax/data?tab=export`
- AX Sprint II 소개 영상 (PASS 17, V2 교체 PASS 18): 플레이어 `src/components/review/ReviewVideo.tsx`(비율 전환·속도·영상 흐름·내려받기) + 데이터 `src/lib/review/ax-sprint2-video.ts`, 파일 `public/media/ax-sprint2/`, 제작 원본·장면표 `video/ax-sprint2/README.md`
- AX Sprint II 심사 페이지 (PASS 16): `src/app/review/ax-sprint2/page.tsx` → `src/components/review/ReviewAxSprint2.tsx`, 공개 시연 데이터·계산 연결 `src/lib/review/ax-sprint2-demo.ts`(실제 `computeProductMetrics`·`generateCandidates`·`computeCustomerInsight` 사용, 저장·전송 없음)
- 심플화·고도화 (PASS 21): ⓘ 안내·펼쳐보기 `src/components/ax/InfoTip.tsx`(`InfoTip`·`Fold`), 카드 `DataCard info=/collapsible`, 탭 ↔ 주소 # `src/lib/use-hash-tab.ts`, 접힘은 `.is-folded`(인쇄 시 펼침) — 설명 문장은 ⓘ로, 덜 보는 것은 접고, 비슷한 것은 탭으로(D-075). 생산 판단 '조건 바꿔 보기' `src/lib/scenario.ts` + `src/components/ax/ProductionPlanner.tsx`(`CoverBar`·`ScenarioModal`) — 계산식 `analytics.planProduction()` 하나를 상품 지표와 같이 씀(D-076)
- 안정화·고도화 (PASS 28): 오류 화면 `src/app/global-error.tsx`·`error.tsx`·`ax/error.tsx`·`beauty/error.tsx`·`not-found.tsx`(D-088), Demo 저장 안전장치 `src/lib/data/demo-store.ts`(저장 실패 = 오류, 손상 자료 원본 보관) + `src/components/ax/DemoRecovery.tsx`(복구 버튼·배너·저장 공간, D-089), 가져오기 기록·되돌리기 `src/components/ax/ImportHistory.tsx` + `DataSource.createImportBatch/undoImport`(migration 011 `import_batches`·RPC `undo_import`), Live 판매 500행 단위 저장 `SALES_CHUNK`(D-090)
- 고도화·UI/UX·안정화 (PASS 29): 날짜 형식기 재사용 `src/lib/date.ts`(D-091), 열린 상태·7테마 대비(D-092), 연결·다시 불러오기 안내 `src/components/ax/ConnectionBanner.tsx` + `DataProvider` stale(D-093), 브리핑 글 복사 `briefingText`·`src/lib/clipboard.ts`, 저장 중 창 닫기 경고 `src/lib/use-leave-guard.ts`(D-094)
- 고도화 (PASS 27): 채널별 판매 입력 주기 `src/lib/channel-cycle.ts`(migration 010 `channels.input_cycle`) → `buildModel`의 `channelAsOf`·`asOfFor`로 채널·상품 '최근 4주' 계산(D-086), 청구·입금 파일 가져오기 `src/lib/settlement-import.ts` + `src/components/ax/SettlementImport.tsx`(정산 탭) + 템플릿 `public/samples/settlements_template.csv`, 연습 키트 ④ `practiceSettlementFile`(D-087)
- 고도화·UI/UX (PASS 15): 운영 기준값 `src/lib/planning.ts` + `src/components/ax/PlanningCard.tsx`(설정 > 운영 기준값, migration 009 `organizations.planning`) → `computeProductMetrics`·`measureOutcome`에 전달, 대화상자·처리 창 body portal `src/components/ax/Modal.tsx`, 처리 창 '지금 다시 계산하면'·첫 단계 버튼 고정 `ActionDrawer.tsx`, 고객 앱 모바일 메뉴 4칸 `BeautyHeader.tsx`
- 고도화·UI/UX (PASS 14): 대표 보고 모드 `src/app/ax/present/page.tsx` + `src/lib/present.ts`(슬라이드 목록·권한·주간 매출), 순위 막대 `src/components/ax/RankBars.tsx`(채널 비교), 실증·Evidence 12주 타임라인·한글 표기(`PROOF_TYPE_LABEL` in `src/lib/evidence.ts`), 설정 바로가기, 주간 점검 품질 항목 `src/lib/weekly-routine.ts`
- UI/UX·고도화 (PASS 13): 알림 센터 `src/lib/notifications.ts`(계산형 — 해결하면 사라짐) + `src/components/ax/NotificationCenter.tsx`(헤더 종 아이콘), 모바일 표→카드 `src/lib/use-narrow.ts`(상품·재고·생산 화면), 월 이동 줄(`/ax/monthly` 모바일), 탭 가장자리 흐림·자동 스크롤 `Tabs.tsx`
- UI/UX (PASS 12): 대시보드 `src/app/ax/page.tsx`(핵심 숫자 → 오늘 할 일+브리핑 → 분석 탭), 빠른 이동 `src/components/ax/QuickJump.tsx`(Ctrl/⌘+K), 컴팩트 행 `ActionRow`·stat tile `KpiCard`(`src/components/ax/Cards.tsx`), 접근성 탭 `Tabs.tsx`, 차트 애니메이션 규칙 `useChartMotion`(`TrendChart.tsx`)
- 샘플 자료 연습 모드(Demo 전용) `src/lib/practice-kit.ts`(가상 파일 생성), `src/components/ax/PracticeKit.tsx` → `/ax/start` · '최근 4주' 기준일 = 마지막 판매일 `src/lib/model.ts`(`salesAsOf`, D-053) · 3단계 보고서 초안 `STAGE3_DELIVERY_REPORT.md` (PASS 11)
- 생산 착수 일정(OEM 생산기간·MOQ) `src/lib/analytics.ts`(`PLANNING`) → `/ax/products?tab=production` · 월 목표 `src/lib/targets.ts`, `MonthlyTargetCard` · Action 사후 성과 `src/lib/action-outcome.ts` · 데이터 품질 점검 `src/lib/data-quality.ts` → `/ax/data?tab=quality` (PASS 10)
- 작업 데이터 백업·이관 `src/lib/transfer.ts`, `src/components/ax/TransferCard.tsx` (Demo 실데이터 → 파일 → Live/복원)
- 사업화·현장확인 `/ax/business` — 사업화 실적 자료(`src/lib/business-report.ts`, 인쇄·근거 CSV) / 면담·현장확인 대비(`src/components/ax/InspectionGuide.tsx`)
- 판매 파일 자료 진단·미등록 상품/채널 즉시 등록: `src/lib/import.ts`(`diagnoseSales`, `findUnknownMasters`), `src/components/ax/ImportMasters.tsx`
- 공개 전 점검 `/ax/system` (`src/lib/readiness.ts`, 서버 설정 `src/app/api/system/status/route.ts` — 값은 반환하지 않음), Supabase 일괄 설치 `supabase/setup_all.sql` (`npm run setup-sql`로 생성)
- 주간 운영 점검 `src/lib/weekly-routine.ts` (시작 가이드 하단·주간 리포트·대시보드 배너)
- 실데이터 시작 가이드 `/ax/start` (`src/lib/start-guide.ts`, 저장된 데이터로 자동 판정)
- 대표 브리핑 AI 문장화(Claude, 기본 꺼짐): `src/app/api/ai/briefing/route.ts`, 숫자 검증 `src/lib/ai/grounding.ts` — 켜는 방법 SETUP.md §G
- 고객 회원·마이페이지 `src/lib/customer-account.ts`, 재구매 예상 `src/lib/repurchase.ts`, 탈퇴 API `src/app/api/customer/account/route.ts`
- Evidence 계산(Money KPI·Baseline 비교): `src/lib/evidence.ts` → 실증 화면 + 주간 리포트(`/ax/reports/weekly`, 인쇄·PDF)
- 판매·상품 파일 가져오기(CSV/XLSX, 열 자동 인식): `src/lib/import.ts`
- 구성원 관리 API(Live, 서버 전용 키): `src/app/api/org/members/route.ts`
- Customer Event Bridge: `src/lib/customer-events.ts`
- Device View (PC / Mobile / PC+Mobile): `src/components/device/DeviceView.tsx`
- Canonical 7 Theme: `src/app/globals.css`, `src/components/providers/SettingsProvider.tsx` — 기본 테마 = 오닉스 골드(`DEFAULT_THEME`, `src/lib/themes.ts`, D-071)
- 고객 플랫폼 디자인: `CUSTOMER_UX_REDESIGN.md` (D-073) — 타이포 클래스 `.b-*`(`globals.css`), 개인화 근거 `useBeautyMemory`, 하단 시트 `BottomSheet`
- 제품 사진: `public/images/products/*.webp`(Demo 제품 A~J, Drive「MIRYEO AI Beauty 이미지 작업물」) → `src/components/shared/ProductVisual.tsx`가 제품 ID로 연결, 사진 없는 제품은 SVG. 고객 홈 카드 이미지 `public/images/beauty/` (D-071)

## Project Memory
`PROJECT_SPEC.md` · `PROJECT_STATE.md` · `STAGE2_DELIVERY_REPORT.md` · `STAGE3_DELIVERY_REPORT.md` · `DECISIONS.md` · `QA_REPORT.md` · `RECOMMENDATIONS.md` · `EVIDENCE_PLAN.md` · `AX_COACH_PLAN.md` · `PROOF_EVENT_SCHEMA.md` · `SETUP.md`

다음 세션에서 "다음 단계 진행해줘"라고 하면 SPEC → STATE → DECISIONS → EVIDENCE_PLAN 순으로 읽고 STATE의 NEXT PRIORITY부터 진행합니다.

## Demo Data 원칙
제품명·채널·거래처·권역은 모두 `Demo` 표기 익명 Placeholder. 효능·성분·평점·리뷰 수·인증·특허 번호를 만들지 않습니다.

---
가연인터내셔널 · MIRYEO Business AX · Powered by 미래AI랩
