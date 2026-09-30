#!/usr/bin/env bash
# 로컬 Supabase 호환 스택 (개발·QA 전용): Postgres + Supabase Auth(GoTrue, 소스 빌드) + REST 게이트웨이 + SMTP 수신
# 사용: GOTRUE_BIN=/path/to/gotrue bash supabase/tests/live-e2e/stack.sh   → .env.live-e2e 생성, 백그라운드 실행
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
DB=${DB:-miryeo_live}
GOTRUE_BIN=${GOTRUE_BIN:-/tmp/gt/gotrue}
APP_URL=${APP_URL:-http://localhost:3200}
export JWT_SECRET=${JWT_SECRET:-local-e2e-secret-change-me-32chars-min}
PSQL="psql -X -q -v ON_ERROR_STOP=1"
PGPASS=${PGPASS:-root}

$PSQL -d postgres -c "alter role current_user password '$PGPASS'" >/dev/null
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB"
$PSQL -d "$DB" -o /dev/null -f "$DIR/roles.sql"
export DATABASE_URL="postgres://$(whoami):$PGPASS@127.0.0.1:5432/$DB?sslmode=disable"

export GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL="http://127.0.0.1:54321/auth/v1"
export GOTRUE_DB_DRIVER=postgres GOTRUE_DB_DATABASE_URL="$DATABASE_URL&search_path=auth" GOTRUE_DB_NAMESPACE=auth
export GOTRUE_SITE_URL="$APP_URL" GOTRUE_URI_ALLOW_LIST="$APP_URL/**"
export GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=true GOTRUE_DISABLE_SIGNUP=false
export GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=2500 GOTRUE_SMTP_ADMIN_EMAIL=noreply@local.test GOTRUE_SMTP_SENDER_NAME=MIRYEO
export GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_LOG_LEVEL=warn
# Supabase 호스팅과 동일: 메일 링크는 /auth/v1/verify
export GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify

"$GOTRUE_BIN" migrate >/tmp/gotrue-migrate.log 2>&1 || { cat /tmp/gotrue-migrate.log; exit 1; }
$PSQL -d "$DB" -o /dev/null -f "$DIR/post-auth.sql"
for f in "$ROOT"/supabase/migrations/00{1,2,3,5,6}_*.sql; do $PSQL -d "$DB" -o /dev/null -f "$f"; done

for f in /tmp/miryeo-gotrue.pid /tmp/miryeo-gateway.pid; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null || true; done
sleep 1
nohup "$GOTRUE_BIN" serve >/tmp/gotrue.log 2>&1 & echo $! > /tmp/miryeo-gotrue.pid
nohup node "$DIR/gateway.mjs" >/tmp/gateway.log 2>&1 & echo $! > /tmp/miryeo-gateway.pid
for i in $(seq 1 30); do curl -sf http://127.0.0.1:9999/health >/dev/null && break; sleep 1; done
for i in $(seq 1 30); do curl -sf http://127.0.0.1:54321/__mail >/dev/null && break; sleep 1; done

eval "$(node "$DIR/keys.mjs")"
cat > "$ROOT/.env.live-e2e" <<ENV
NEXT_PUBLIC_DATA_MODE=live
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
ENV
echo "STACK READY — auth: $(curl -s http://127.0.0.1:9999/health)"
