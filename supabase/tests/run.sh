#!/usr/bin/env bash
# 로컬 Postgres에서 migration 001~005 + RLS 검증. 사용: PGURI=postgres://... bash supabase/tests/run.sh
# (기본: 로컬 postgres 사용자로 miryeo_verify DB를 새로 만든다 — 실제 Supabase DB에는 실행 금지)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${DB:-miryeo_verify}
PSQL=${PSQL:-"psql -X -q -v ON_ERROR_STOP=1"}
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { echo "── $1"; $PSQL -d "$DB" -o /dev/null -f "$1" 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  /  /'; test "${PIPESTATUS[0]}" -eq 0; }
run supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/00{1,2,3,5,6}_*.sql; do run "$f"; done
run supabase/tests/10_rls_test.sql
run supabase/tests/20_event_guard_test.sql
run supabase/migrations/004_seed_demo_optional.sql
echo "── idempotency: 005·006 재실행"; run supabase/migrations/005_pilot_v2_pass2.sql; run supabase/migrations/006_event_guard.sql
echo "VERIFY OK"
