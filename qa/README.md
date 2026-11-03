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
| `unit35.mjs` | 단위 — 생산 일정 협의 요청 글 계산 (`src/lib/production-request.ts`, 브라우저 불필요) |

## 실행
```bash
npm run build && npx next start -p 3100          # Demo 빌드를 띄운다 (다른 주소면 BASE=…)
# 도구는 저장소 밖에 둔다 (npm install이 지우지 않게)
#   Playwright: 기본 /opt/node-tools/node_modules (다르면 QA_NODE_MODULES=…/node_modules/)
#   axe-core:  작업 폴더에서 npm install axe-core@4.10.2 → AXE_PATH=…/node_modules/axe-core/axe.min.js
node qa/unit35.mjs
node qa/sweep.mjs
AXE_PATH=… node qa/a11y.mjs
AXE_PATH=… node qa/pass35.mjs
AXE_PATH=… node qa/pass36.mjs
```
- 모두 Demo 모드(브라우저 저장)에서 돈다. 검수 중 저장한 값은 그 브라우저 문맥에만 남는다.
- Live(Supabase) 흐름은 `supabase/tests/live-e2e/run.sh` (SETUP.md §E).
