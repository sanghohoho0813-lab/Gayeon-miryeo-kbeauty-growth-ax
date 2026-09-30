#!/usr/bin/env bash
# Live E2E 전체 실행: 스택 초기화 → Live 빌드(A) → 조직 생성 → 조직 ID로 재빌드(B) → 전체 시나리오
# 전제: Postgres 16 실행 중, GoTrue 바이너리(GOTRUE_BIN), playwright-core 설치, Chromium(CHROMIUM_PATH)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
PORT=${APP_PORT:-3200}
stop_app() {
  # npx 래퍼뿐 아니라 실제 next-server까지 종료 (포트 기준)
  fuser -k -n tcp "$PORT" >/dev/null 2>&1 || true
  [ -f /tmp/miryeo-app.pid ] && kill "$(cat /tmp/miryeo-app.pid)" 2>/dev/null || true
  for i in $(seq 1 20); do fuser -n tcp "$PORT" >/dev/null 2>&1 || return 0; sleep 0.5; done
}
start_app() {
  (set -a; . ./.env.live-e2e; [ -n "${1:-}" ] && NEXT_PUBLIC_MIRYEO_ORG_ID="$1"; set +a; npx next build >/tmp/app-build.log 2>&1) || { tail -30 /tmp/app-build.log; exit 1; }
  (set -a; . ./.env.live-e2e; [ -n "${1:-}" ] && NEXT_PUBLIC_MIRYEO_ORG_ID="$1"; set +a; nohup npx next start -p "$PORT" >/tmp/app-live.log 2>&1 & echo $! > /tmp/miryeo-app.pid)
  for i in $(seq 1 40); do curl -sf -o /dev/null "http://localhost:$PORT/login" && return; sleep 1; done
}
bash supabase/tests/live-e2e/stack.sh | tail -1
stop_app; start_app ""
PHASE=A node supabase/tests/live-e2e/e2e.mjs
# 고객 회원가입은 개인정보 처리방침 URL·버전이 있어야 열린다 (계약 제17조)
export NEXT_PUBLIC_PRIVACY_POLICY_URL="https://example.com/privacy" NEXT_PUBLIC_PRIVACY_VERSION="v-e2e"
stop_app; start_app "$(cat /tmp/miryeo-live-e2e/org-id)"
PHASE=B node supabase/tests/live-e2e/e2e.mjs
stop_app
echo "LIVE E2E DONE — 결과물: /tmp/miryeo-live-e2e (스크린샷, 주간 리포트 PDF). 앱은 이후 Demo로 다시 빌드할 것: npm run build"
