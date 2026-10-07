#!/usr/bin/env node
/* supabase/setup_all.sql 생성 — 새 Supabase 프로젝트의 SQL Editor에 한 번에 붙여 넣는 설치 파일.
   migration 001·002·003·005·006·007을 순서대로 합친다 (004 Demo seed 제외).
   사용: node scripts/build-setup-sql.mjs        → 파일 생성
         node scripts/build-setup-sql.mjs --check → 파일이 migration과 다르면 실패 (verify:db에서 사용) */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["001_base_schema.sql", "002_indexes.sql", "003_rls.sql", "005_pilot_v2_pass2.sql", "006_event_guard.sql", "007_stage2_customers_settlements.sql"];
const parts = files.map((f) => ({ f, sql: readFileSync(join(root, "supabase/migrations", f), "utf8").trimEnd() }));
const hash = createHash("sha256").update(parts.map((p) => p.sql).join("\n")).digest("hex").slice(0, 12);

const out = `-- ============================================================================
-- MIRYEO K-Beauty Growth AX — Supabase 일괄 설치 (자동 생성 파일, 직접 수정 금지)
-- 생성: node scripts/build-setup-sql.mjs · 원본: supabase/migrations/${files.map((f) => f.slice(0, 3)).join("·")} · sha ${hash}
--
-- 사용: **새** Supabase 프로젝트 > SQL Editor > 이 파일 전체를 붙여 넣고 Run (1회).
--   - 이미 001~003을 실행한 프로젝트에는 쓰지 않는다 (정책 중복으로 실패). 그때는 남은 번호 파일만 실행.
--   - Demo seed(004)는 포함하지 않는다.
--   - 하나의 트랜잭션으로 실행된다: 중간에 실패하면 아무것도 바뀌지 않는다.
-- 확인: 실행 후 앱의 '공개 전 점검'(/ax/system) 화면에서 데이터베이스 항목이 모두 정상인지 본다.
-- ============================================================================

begin;
${parts.map((p) => `\n-- ───────────── ${p.f} ─────────────\n${p.sql}\n`).join("")}
commit;
`;

const target = join(root, "supabase/setup_all.sql");
if (process.argv.includes("--check")) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== out) {
    console.error("setup_all.sql이 migration과 다릅니다 → node scripts/build-setup-sql.mjs 실행");
    process.exit(1);
  }
  console.log(`setup_all.sql 최신 (sha ${hash})`);
} else {
  writeFileSync(target, out);
  console.log(`supabase/setup_all.sql 생성 (sha ${hash}, ${out.split("\n").length}줄)`);
}
