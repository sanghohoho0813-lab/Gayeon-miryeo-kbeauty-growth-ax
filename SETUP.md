# SETUP — MIRYEO K-Beauty Growth AX

## A. 로컬 실행 (DEMO)
```bash
npm install
npm run dev            # http://localhost:3000  (기본 NEXT_PUBLIC_DATA_MODE=demo)
npm run typecheck && npm run build
```
Demo 모드: Seed + 브라우저 저장소. 설정 > Demo 초기화로 원상복구.

## B. LIVE 전환 — 사용자 직접 작업 (총 10단계)

### [SUPABASE]
1. Supabase Project 생성(또는 기존 Project 확인)
2. SQL Editor에서 순서대로 실행: `supabase/migrations/001_base_schema.sql` → `002_indexes.sql` → `003_rls.sql`
   - `004_seed_demo_optional.sql`은 동작 확인용 (실운영 DB에는 선택)
3. Authentication > Users에서 OWNER 계정 생성 (email + password)

### [ENV] (`.env.local` 또는 Vercel Environment Variables)
4. `NEXT_PUBLIC_DATA_MODE=live`
5. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. 서비스 롤 키가 필요해지면 **서버 전용** `SUPABASE_SERVICE_ROLE_KEY` (NEXT_PUBLIC 금지)

### [최초 로그인]
7. `/login` 로그인 → "조직 만들기" → 해당 계정이 OWNER가 됨 (`bootstrap_organization` RPC)
8. 생성된 `organizations.id`를 `NEXT_PUBLIC_MIRYEO_ORG_ID`에 설정 (고객 화면 이벤트 기록 대상) → 재배포

### [VERCEL]
9. Environment Variables 반영 후 Redeploy

### [DATA]
10. 데이터 관리에서 실제 채널 → 상품 1~2개 → 재고 → 판매(1건 또는 `public/samples/sales_template.csv`) 입력, 고객 화면 공개할 상품은 "고객 화면에 공개" 체크

## C. 구성원 추가 (현재 수동)
Authentication에서 사용자 생성 후 SQL:
```sql
insert into organization_members (organization_id, user_id, role)
values ('<org id>', '<auth user id>', 'STAFF'); -- OWNER / ADMIN / STAFF
```

## D. 확인 체크
- Live에서 Supabase 오류 시 Error 화면이 떠야 정상 (Demo 숫자로 대체하지 않음)
- STAFF 계정: 채널·B2B·수출 메뉴 숨김 + RLS로 B2B/수출 조회 차단
- 고객 화면 Finder 완료 → `customer_events`에 행 생성 → AX 고객 인사이트 반영
