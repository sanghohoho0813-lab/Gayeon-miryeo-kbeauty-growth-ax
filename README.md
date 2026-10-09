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

## 실행
```bash
npm install
npm run dev          # Demo 모드 (기본)
npm run typecheck
npm run build
npm run verify:db    # (선택) 로컬 Postgres로 migration + RLS·트리거 97개 시나리오 + setup_all.sql 동등성 검증
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
- Schema / RLS: `supabase/migrations/001~007` (005·007 필수, 006 고객 화면 공개 전 필수), 검증: `supabase/tests/`
- 월별 실적 `/ax/monthly`, 정산·미수금 `/ax/channels?tab=settlements`, 대표 브리핑 `src/lib/briefing.ts`, 내보내기 `/ax/data?tab=export`
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
- Canonical 7 Theme: `src/app/globals.css`, `src/components/providers/SettingsProvider.tsx`

## Project Memory
`PROJECT_SPEC.md` · `PROJECT_STATE.md` · `DECISIONS.md` · `QA_REPORT.md` · `RECOMMENDATIONS.md` · `EVIDENCE_PLAN.md` · `AX_COACH_PLAN.md` · `PROOF_EVENT_SCHEMA.md` · `SETUP.md`

다음 세션에서 "다음 단계 진행해줘"라고 하면 SPEC → STATE → DECISIONS → EVIDENCE_PLAN 순으로 읽고 STATE의 NEXT PRIORITY부터 진행합니다.

## Demo Data 원칙
제품명·채널·거래처·권역은 모두 `Demo` 표기 익명 Placeholder. 효능·성분·평점·리뷰 수·인증·특허 번호를 만들지 않습니다.

---
가연인터내셔널 · MIRYEO Business AX · Powered by 미래AI랩
