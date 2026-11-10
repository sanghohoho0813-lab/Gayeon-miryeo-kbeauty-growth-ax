# qa — 브라우저 검수 스크립트 (PASS 35부터 저장소에 보관)

PASS 34까지의 검수 스크립트(qa-pass2 ~ qa-pass34, 33종)는 저장소 밖 작업 폴더에 있었고 컨테이너가 바뀌며 사라졌다.
PASS 35부터는 다시 만든 검수를 이 폴더에 두고, 회차마다 `passNN.mjs`를 더한다.

| 파일 | 내용 |
|---|---|
| `lib.mjs` | 공통 — 브라우저 띄우기(튜토리얼 닫힘·한국 시간·테마), 오류 모으기, 가로 넘침, axe 실행, 결과 집계 |
| `sweep.mjs` | 전 화면 회귀 — 모든 주소 × 360·390·768·1440: 응답 200 · 페이지 오류 0 · 콘솔 오류 0 · 가로 넘침 0 |
| `a11y.mjs` | 접근성 회귀 — axe(WCAG 2.1 A·AA): AX 전 화면 × 7테마(1440) + AX·고객·심사 화면 390 |
| `pass35.mjs` | PASS 35 기능 검수 (D-127 ~ D-131) |
| `pass36.mjs` | PASS 36 기능 검수 (D-132 ~ D-135, D-127 보완) |
| `pass37.mjs` | PASS 37 기능 검수 (D-136 ~ D-138) |
| `pass39.mjs` | PASS 39 기능 검수 (D-142 · D-143) |
| `pass40.mjs` | PASS 40 검수 — 화면 제목 · 본문으로 건너뛰기 · 제목 단계 · 랜드마크 · 초점 표시 (D-145) |
| `stability.mjs` | 안정화 검수 (PASS 41·42, D-146 ~ D-152) — 빌드한 날과 다른 날(가짜 시계)에 열기 · 자정 넘김 · 차트·화면 묶음 실패 · 손상된 저장값 · 같은 순간 두 번 누름 · 새 버전 알림 · 이 브라우저의 오류 기록 |
| `run-all.mjs` | 전체 검수 한 번에 (`npm run qa`) — 단위 → 브라우저 검수(동시에 2개) → 성능(혼자). 결과 표와 실패한 줄을 보여 준다 |
| `perf.mjs` | 첫 화면 성능 — 화면별 첫 로드 JS 크기·차트·Supabase 포함 여부·기준선, 휴대폰 조건 FCP·LCP·CLS·TBT (PASS 38, D-139 ~ D-141). `PERF_ONLY=size`면 크기만 |
| `unit35.mjs` | 단위 — 생산 일정 협의 요청 글 계산 (`src/lib/production-request.ts`, 브라우저 불필요) |
| `unit37.mjs` | 단위 — 지난 확인 이후 비교 (`src/lib/since-last.ts`, 브라우저 불필요) |
| `unit39.mjs` | 단위 — Demo 실데이터 백업 상태 (`src/lib/backup-status.ts`, 브라우저 불필요) |
| `unit41.mjs` | 단위 — 다음 자정까지(`date.ts`) · 묶음 오류 판별·한 번만 새로고침(`chunk-error.ts`) · 고객 저장값 정리(`beauty-store.ts`) · 새 버전 판별(`build-version.ts`) · 오류 기록(`error-log.ts`) |

## 실행
```bash
npm run build && npx next start -p 3100          # Demo 빌드를 띄운다 (다른 주소면 BASE=…)
# 도구는 저장소 밖에 둔다 (npm install이 지우지 않게)
#   Playwright: 기본 /opt/node-tools/node_modules (다르면 QA_NODE_MODULES=…/node_modules/)
#   axe-core:  작업 폴더에서 npm install axe-core@4.10.2 → AXE_PATH=…/node_modules/axe-core/axe.min.js
AXE_PATH=… npm run qa                             # 아래 전부를 한 번에 (일부만: QA_ONLY=stability,sweep · 빼기: QA_SKIP=perf)
# 하나씩 돌릴 때
node qa/unit35.mjs
node qa/unit37.mjs
node qa/unit39.mjs
node qa/unit41.mjs
node qa/sweep.mjs
AXE_PATH=… node qa/a11y.mjs
AXE_PATH=… node qa/pass35.mjs
AXE_PATH=… node qa/pass36.mjs
AXE_PATH=… node qa/pass37.mjs
AXE_PATH=… node qa/pass39.mjs
AXE_PATH=… node qa/pass40.mjs
AXE_PATH=… node qa/stability.mjs
node qa/perf.mjs
```
- 화면 점검(`sweep`)은 **빌드한 날에만 돌리면 날짜가 같아서** 날짜 결함을 못 잡는다(D-146). 날짜·시간에 기대는 화면을 고치면 `stability`를 함께 돌린다.
- 모두 Demo 모드(브라우저 저장)에서 돈다. 검수 중 저장한 값은 그 브라우저 문맥에만 남는다.
- Live(Supabase) 흐름은 `supabase/tests/live-e2e/run.sh` (SETUP.md §E).
