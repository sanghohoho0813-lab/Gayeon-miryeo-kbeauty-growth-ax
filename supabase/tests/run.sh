#!/usr/bin/env bash
# 로컬 Postgres에서 migration 001~007 + RLS 검증 + setup_all.sql 동등성. 사용: PGURI=postgres://... bash supabase/tests/run.sh
# (기본: 로컬 postgres 사용자로 miryeo_verify DB를 새로 만든다 — 실제 Supabase DB에는 실행 금지)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${DB:-miryeo_verify}
PSQL=${PSQL:-"psql -X -q -v ON_ERROR_STOP=1"}
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { local db=${2:-$DB}; echo "── $1${2:+ ($2)}"; $PSQL -d "$db" -o /dev/null -f "$1" 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  /  /'; test "${PIPESTATUS[0]}" -eq 0; }
run supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/00{1,2,3,5,6,7}_*.sql; do run "$f"; done
dump() { pg_dump -s -O -x -d "$1" | grep -vE '^(--|SET |SELECT pg_catalog.set_config|\\(un)?restrict)' | sed '/^$/d'; }
dump "$DB" > /tmp/miryeo-schema-files.sql   # 테스트 보조 함수가 생기기 전 스키마
run supabase/tests/10_rls_test.sql
run supabase/tests/20_event_guard_test.sql
run supabase/tests/30_stage2_test.sql
run supabase/migrations/004_seed_demo_optional.sql
echo "── idempotency: 005·006 재실행"; run supabase/migrations/005_pilot_v2_pass2.sql; run supabase/migrations/006_event_guard.sql; run supabase/migrations/007_stage2_customers_settlements.sql
echo "── setup_all.sql: 최신 여부 + 새 DB에 한 번에 적용 → 개별 migration 결과와 스키마 동일"
node scripts/build-setup-sql.mjs --check
DB2=${DB}_all
$PSQL -d postgres -c "drop database if exists $DB2" -c "create database $DB2"
run supabase/tests/00_supabase_stub.sql "$DB2"
run supabase/setup_all.sql "$DB2"
if ! diff /tmp/miryeo-schema-files.sql <(dump "$DB2") > /tmp/miryeo-schema.diff; then echo "스키마 불일치 — /tmp/miryeo-schema.diff"; head -40 /tmp/miryeo-schema.diff; exit 1; fi
echo "  스키마 동일 ($(dump "$DB2" | grep -c '^CREATE') CREATE 문)"
$PSQL -d postgres -c "drop database if exists $DB2"
echo "VERIFY OK"
