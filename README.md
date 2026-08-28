# MIRYEO K-Beauty Growth AX

가연인터내셔널의 K-Beauty 브랜드 **MIRYEO(미려)** 를 위한 AX MVP.
판매·재고·생산·채널·고객 데이터를 하나로 연결하고, AI가 다음 성장 행동을 제안하는 운영 시스템입니다.

| 영역 | 경로 | 대상 |
| --- | --- | --- |
| **MIRYEO Business AX** | `/ax` | 대표·직원용 내부 운영 시스템 |
| **MIRYEO AI Beauty** | `/beauty` | 소비자용 제품 탐색·AI 추천 플랫폼 |

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드
```

## 기술 스택

- Next.js 15 (App Router) · TypeScript · Tailwind CSS 4
- Recharts (차트) · Lucide Icons
- Supabase (선택) — 환경변수 미설정 시 Demo Seed Data로 자동 fallback

## 데이터 구조

```
UI → repository / service layer → Supabase 또는 Demo Seed Data
```

- Demo 데이터: `src/lib/demo/` (products, sales, inventory, channels, customers)
- Repository: `src/lib/repository/` — Supabase 테이블이 있으면 사용, 없으면 Demo fallback
- 분석 엔진: `src/lib/analytics.ts` — 성장률·재고일수·마진율·위험점수·AI Action을 **규칙 기반 코드로 계산**
- 추천 엔진: `src/lib/beauty-recommend.ts` — 고민·사용감·예산 점수화로 루틴 구성

### Supabase 연동

`.env.local`에 아래 값을 설정하면 Demo → Live로 전환됩니다.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

예상 테이블: `products`, `sales_records`, `inventory`, `production_plans`,
`channels`, `b2b_accounts`, `export_records`, `customer_profiles`, `customer_events`
(필드는 `src/lib/types.ts` 기준)

## 주요 화면

**Business AX** (`/ax`)
- 대시보드 — KPI 4종, 오늘의 Action, 채널별 매출, SKU 성장 랭킹, 재고 위험 Matrix, AI Insight
- 상품·재고·생산 — 상품 목록/상세 Drawer, 재고 현황(추천 발주량), OEM 생산, CSV 데이터 가져오기
- 채널·B2B·수출 — 채널 비교/수익성, B2B 거래처, 권역별 수출
- AI Growth Center — 우선순위 Action(근거·영향·권장 행동), 재구매 기회, 고객 관심도
- 실증·리포트 / 기획의도 / 설정 (테마 9종 · 글자 크기 3단계 · 튜토리얼)

**AI Beauty** (`/beauty`)
- 홈 — Hero, 피부 고민 바로가기, 추천 제품, 루틴 세트, 브랜드 스토리
- AI Beauty Finder — 6단계 분석 → 맞춤 루틴 추천 → Beauty Passport 저장
- 제품 목록/상세 — 고민·유형 필터, 구매 채널 안내(Demo)
- 뷰티 패스포트 — 내 피부 관심사, 추천 루틴, 찜, 최근 본 제품 (localStorage 기반)

## Demo Data 원칙

- 실제 제품 자료 수령 전까지 모든 제품·채널·거래처는 **(Demo)** 표기
- 근거 없는 효능·성분·의학적 표현은 사용하지 않음
- 제품 이미지는 Premium Cosmetic SVG Placeholder — 실제 이미지 수령 시 `ProductVisual` 컴포넌트만 교체

---

가연인터내셔널 · MIRYEO Business AX · **Powered by 미래AI랩**
