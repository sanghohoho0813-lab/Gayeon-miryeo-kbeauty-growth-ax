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
2. SQL Editor에서 순서대로 실행: `001_base_schema.sql` → `002_indexes.sql` → `003_rls.sql` → **`005_pilot_v2_pass2.sql`**
   - **005는 필수**: Baseline Lock, Action 상태 가드, 고객 이벤트 익명 기록 정책 수정(003만으로는 고객 이벤트가 기록되지 않음), Realtime 등록
   - `004_seed_demo_optional.sql`은 동작 확인용 (실운영 DB에는 선택)
   - 이미 001~003을 적용했다면 005만 추가 실행하면 됨 (재실행 안전)
3. Authentication > Users에서 OWNER 계정 생성 (email + password)

### [ENV] (`.env.local` 또는 Vercel Environment Variables)
4. `NEXT_PUBLIC_DATA_MODE=live`
5. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. (선택) 앱 내 구성원 초대를 쓰려면 **서버 전용** `SUPABASE_SERVICE_ROLE_KEY` (NEXT_PUBLIC 금지). 없으면 §C의 SQL로 추가
   - 초대 메일 링크가 돌아올 주소: Supabase Authentication > URL Configuration의 Site URL / Redirect URLs에 배포 주소의 `/login` 추가

### [최초 로그인]
7. `/login` 로그인 → "조직 만들기" → 해당 계정이 OWNER가 됨 (`bootstrap_organization` RPC)
8. 생성된 `organizations.id`를 `NEXT_PUBLIC_MIRYEO_ORG_ID`에 설정 (고객 화면 이벤트 기록 대상) → 재배포

### [VERCEL]
9. Environment Variables 반영 후 Redeploy

### [DATA]
10. 데이터 관리에서 실제 채널 → 상품 1~2개 → 재고 → 판매(1건 또는 `public/samples/sales_template.csv`) 입력, 고객 화면 공개할 상품은 "고객 화면에 공개" 체크

## C. 구성원 추가
- **앱 내 (권장)**: 설정 > 구성원 > 이메일·역할 입력 → 초대 (OWNER, `SUPABASE_SERVICE_ROLE_KEY` 필요). 초대받은 사람은 메일 링크 → 비밀번호 지정 → `/ax`
- **수동 (키 없이)**: Authentication에서 사용자 생성 후 SQL:
```sql
insert into organization_members (organization_id, user_id, role)
values ('<org id>', '<auth user id>', 'STAFF'); -- OWNER / ADMIN / STAFF
```

## D. 첫 주 운영 (Week 0)
1. 설정 > 실증 운영: Pilot 시작일, AX OWNER 지정
2. 실증·Evidence > MONEY KPI 3: KPI별 Baseline 잠금 (실측·자기기록 값만, 측정 방법·기간 기록)
3. 데이터 관리 > 판매 입력·파일: 쇼핑몰/자체 엑셀(.xlsx·.csv) 그대로 업로드 → 열 매핑 확인 → 저장
4. 매주: 실증·Evidence > 주간 리포트 → 인쇄 / PDF 저장

## E. DB 검증 (개발자용, 로컬 Postgres)
`npm run verify:db` — 로컬 Postgres에 Supabase 흉내 환경(auth stub, anon/authenticated 역할)을 만들고 001~005 + RLS 55개 시나리오를 실행. **실제 Supabase DB에는 실행하지 않는다.**

## F. 확인 체크
- Live에서 Supabase 오류 시 Error 화면이 떠야 정상 (Demo 숫자로 대체하지 않음)
- STAFF 계정: 채널·B2B·수출 메뉴 숨김 + RLS로 B2B/수출 조회 차단
- 고객 화면 Finder 완료 → `customer_events`에 행 생성 → AX 고객 인사이트 반영
