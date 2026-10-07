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
2. **새 프로젝트(권장)**: SQL Editor에 `supabase/setup_all.sql` 전체를 붙여 넣고 Run — 001·002·003·005·006·007을 한 트랜잭션으로 설치 (실패하면 아무것도 바뀌지 않음, 004 Demo seed 제외). 이미 일부를 실행한 프로젝트는 아래처럼 남은 번호만 실행.
   - 개별 실행 순서: `001_base_schema.sql` → `002_indexes.sql` → `003_rls.sql` → **`005_pilot_v2_pass2.sql`** → **`006_event_guard.sql`** → **`007_stage2_customers_settlements.sql`**
   - **005는 필수**: Baseline Lock, Action 상태 가드, 고객 이벤트 익명 기록 정책 수정(003만으로는 고객 이벤트가 기록되지 않음), Realtime 등록
   - `004_seed_demo_optional.sql`은 동작 확인용 (실운영 DB에는 선택)
   - **006 권장(고객 화면 공개 전 필수)**: 익명 이벤트 한도·서버 시각 강제
   - **007 필수**: 고객 회원·구매이력·정산·제품 사용기간
   - 이미 적용한 번호 이후만 추가 실행하면 됨 (005·006 재실행 안전)
3. Authentication > Users에서 OWNER 계정 생성 (email + password)

### [ENV] (`.env.local` 또는 Vercel Environment Variables)
4. `NEXT_PUBLIC_DATA_MODE=live`
5. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. (선택) 앱 내 구성원 초대를 쓰려면 **서버 전용** `SUPABASE_SERVICE_ROLE_KEY` (NEXT_PUBLIC 금지). 없으면 §C의 SQL로 추가
   - 초대 메일 링크가 돌아올 주소: Supabase Authentication > URL Configuration의 Site URL / Redirect URLs에 배포 주소의 `/login` 추가

### [고객 회원가입 — 개인정보]
6-2. 가연인터내셔널 개인정보 처리방침 확정 후 `NEXT_PUBLIC_PRIVACY_POLICY_URL`(공개 URL), `NEXT_PUBLIC_PRIVACY_VERSION`(예: 2026-10-v1) 설정. **없으면 Live 회원가입이 비활성**(로그인만 가능). 계약 별지 제6호 적용 여부 확정.
6-3. Supabase Authentication > URL Configuration: Redirect URLs에 `/beauty/me`(가입 인증 메일) 추가. 이메일 인증을 켜 두면 인증 후 첫 로그인 때 가입이 완료됩니다.

### [최초 로그인]
7. `/login` 로그인 → "조직 만들기" → 해당 계정이 OWNER가 됨 (`bootstrap_organization` RPC)
8. 생성된 `organizations.id`를 `NEXT_PUBLIC_MIRYEO_ORG_ID`에 설정 (고객 화면 이벤트 기록 대상) → 재배포

### [VERCEL]
9. Environment Variables 반영 후 Redeploy
9-1. 대표 계정으로 **`/ax/system` 공개 전 점검** → "공개 가능 — 문제 없음" 확인 (DB 설치·익명 노출·조직 ID·공개 상품·관리 키를 자동 확인, 조직 ID 복사 버튼 있음). 문제 항목은 화면의 '해결' 안내대로 처리

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
> 앱의 **시작 가이드**(`/ax/start`, 대표·관리자)가 아래 순서를 저장된 데이터로 자동 체크합니다.

1. 설정 > 실증 운영: Pilot 시작일, AX OWNER 지정
2. 실증·Evidence > MONEY KPI 3: KPI별 Baseline 잠금 (실측·자기기록 값만, 측정 방법·기간 기록)
3. 데이터 관리 > 판매 입력·파일: 쇼핑몰/자체 엑셀(.xlsx·.csv) 그대로 업로드 → 열 매핑 확인 → 저장
4. 매주: 실증·Evidence > 주간 리포트 → 인쇄 / PDF 저장 (리포트 끝에 **운영 점검 6항목** 포함 — 판매 입력·재고 갱신·Action 검토·결과 기록·Proof 확정·연체 미수금. 시작 가이드 하단과 같은 판정)

## E. 검증 도구 (개발자용 — 실제 Supabase DB에는 실행하지 않는다)
- `npm run verify:db` — 로컬 Postgres에 auth stub을 만들고 001~007 + RLS·트리거 97개 시나리오 실행, `setup_all.sql`이 최신인지 확인하고 새 DB에 한 번에 적용해 개별 migration 결과와 스키마가 같은지 비교
- `npm run setup-sql` — migration을 고친 뒤 `supabase/setup_all.sql` 다시 생성 (직접 수정 금지)
- `bash supabase/tests/live-e2e/run.sh` — 로컬 Supabase 호환 스택으로 앱을 **Live 모드로 빌드·실행**하고 브라우저 E2E 실행 (Phase A 7 + B 60 — 공개 전 점검 정상 판정과 RLS 해제 시 노출 탐지 포함)
  - 전제: Postgres 16 실행 중, Supabase Auth 바이너리(`GOTRUE_BIN`, `github.com/supabase/auth`를 Go로 빌드), `npm i --no-save playwright-core@1.56` (설치된 Chromium 1194와 같은 버전 — 버전이 다르면 networkidle 대기가 멈출 수 있음), Chromium(`CHROMIUM_PATH`)
  - 구성: `stack.sh`(DB·Auth·게이트웨이·SMTP 수신), `gateway.mjs`(PostgREST 호환 최소 구현 — 검증 전용), `e2e.mjs`(Phase A/B)
  - 끝나면 `.next`가 Live 빌드이므로 `npm run build`로 다시 빌드

## F. 확인 체크
- Live에서 Supabase 오류 시 Error 화면이 떠야 정상 (Demo 숫자로 대체하지 않음)
- STAFF 계정: 채널·B2B·수출 메뉴 숨김 + RLS로 B2B/수출 조회 차단
- 고객 화면 Finder 완료 → `customer_events`에 행 생성 → AX 고객 인사이트 반영

## G. (선택) 대표 브리핑 AI 문장화 켜기 — 고객사 승인 후
외부 AI 사용료는 고객사 부담(계약 제16조). 꺼져 있어도 RULE 브리핑은 그대로 동작합니다.
1. Anthropic Console에서 API 키 발급 (사용 한도 설정 권장)
2. Vercel 환경변수 (서버 전용, NEXT_PUBLIC 금지): `ANTHROPIC_API_KEY`, `AI_BRIEFING_ENABLED=true`
3. 화면 버튼: `NEXT_PUBLIC_AI_BRIEFING=on` → Redeploy (빌드 시 반영)
4. 대표 계정으로 대시보드 > 대표 브리핑 > "AI 문장으로 요약" 1회 실행 → "숫자 검증 통과" 표시 확인
- 보내는 내용: RULE 브리핑 문장만 (원본 판매·고객 데이터·개인정보 없음). 기록에 없는 숫자가 나오면 자동 폐기.
- 사용 권한: 대표·관리자, 서버 인스턴스당 시간당 20회. 끄기: `AI_BRIEFING_ENABLED` 삭제 (즉시 503, 화면은 RULE 요약 유지)
