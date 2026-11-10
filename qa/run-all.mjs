// 전체 검수 한 번에 (PASS 41) — 단위 → 브라우저 검수(동시에 2개) → 성능(혼자)
//   npm run build && npx next start -p 3100   (다른 주소면 BASE=…)
//   AXE_PATH=…/axe-core/axe.min.js npm run qa
//   일부만: QA_ONLY=stability,sweep npm run qa · 빼기: QA_SKIP=perf npm run qa · 동시 실행 수: QA_JOBS=3
import { spawn } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:3100";
const UNITS = ["unit35", "unit37", "unit39", "unit41"];
const BROWSER = ["sweep", "a11y", "pass35", "pass36", "pass37", "pass39", "pass40", "stability"];
const ALONE = ["perf"]; // 시간을 재므로 다른 검수와 함께 돌리지 않는다
const only = (process.env.QA_ONLY || "").split(",").filter(Boolean), skip = (process.env.QA_SKIP || "").split(",").filter(Boolean);
const pick = (list) => list.filter((n) => (only.length ? only.includes(n) : true) && !skip.includes(n));
const jobs = Math.max(1, Number(process.env.QA_JOBS) || 2);
const logDir = process.env.QA_LOG_DIR || mkdtempSync(join(tmpdir(), "miryeo-qa-"));

const needBrowser = pick(BROWSER).length + pick(ALONE).length > 0;
if (needBrowser) {
  const ok = await fetch(`${BASE}/ax`).then((r) => r.status === 200).catch(() => false);
  if (!ok) { console.error(`앱이 ${BASE} 에 떠 있지 않습니다 — npm run build && npx next start -p 3100`); process.exit(2); }
  if (!process.env.AXE_PATH) { console.error("AXE_PATH가 필요합니다 — qa/README.md '실행' 참고"); process.exit(2); }
}

const results = [];
function run(name) {
  return new Promise((resolve) => {
    const t0 = Date.now(); let out = "";
    const c = spawn(process.execPath, [join(here, `${name}.mjs`)], { cwd: join(here, ".."), env: process.env });
    c.stdout.on("data", (d) => { out += d; }); c.stderr.on("data", (d) => { out += d; });
    c.on("close", (code) => {
      writeFileSync(join(logDir, `${name}.log`), out);
      const line = out.trim().split("\n").filter((l) => /통과 · \d+ 실패/.test(l)).pop() ?? "(결과 줄 없음 — 중간에 멈춤)";
      const m = line.match(/(\d+) 통과 · (\d+) 실패/);
      const r = { name, ok: code === 0 && !!m && m[2] === "0", pass: m ? Number(m[1]) : 0, fail: m ? Number(m[2]) : -1, sec: Math.round((Date.now() - t0) / 1000) };
      results.push(r);
      console.log(`${r.ok ? "통과" : "실패"}  ${name.padEnd(10)} ${String(r.pass).padStart(4)} 통과 · ${r.fail < 0 ? "?" : r.fail} 실패 · ${r.sec}초`);
      if (!r.ok) console.log(out.split("\n").filter((l) => /FAIL|Error|error/.test(l)).slice(0, 12).map((l) => `      ${l.slice(0, 260)}`).join("\n"));
      resolve();
    });
  });
}
async function pool(list, n) {
  const q = [...list];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { while (q.length) await run(q.shift()); }));
}

const t0 = Date.now();
await pool(pick(UNITS), 4);
await pool(pick(BROWSER), jobs);
await pool(pick(ALONE), 1);
const bad = results.filter((r) => !r.ok);
console.log(`\n전체 검수: ${results.length}종 · ${results.reduce((a, r) => a + r.pass, 0)}건 통과 · 실패 ${bad.length}종${bad.length ? ` (${bad.map((r) => r.name).join(", ")})` : ""} · ${Math.round((Date.now() - t0) / 1000)}초 · 기록 ${logDir}`);
process.exitCode = bad.length ? 1 : 0;
