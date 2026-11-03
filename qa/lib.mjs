// QA 공통 — 브라우저 검수 스크립트 (PASS 35부터 저장소에 보관. 실행 방법은 qa/README.md)
import { createRequire } from "module";
import { readFileSync } from "fs";

const req = createRequire(process.env.QA_NODE_MODULES || "/opt/node-tools/node_modules/");
export const { chromium } = req("playwright");
export const BASE = process.env.BASE || "http://localhost:3100";
export const THEMES = ["deep-navy", "navy-gold", "emerald-gold", "forest-sage", "deep-teal", "onyx-gold", "pure-white"];

let pass = 0;
const fails = [];
export function check(name, ok, detail = "") {
  if (ok) pass++;
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return ok;
}
export function summary(label) {
  console.log(`\n${label}: ${pass} 통과 · ${fails.length} 실패`);
  if (fails.length) { console.log(fails.map((f) => ` - ${f}`).join("\n")); process.exitCode = 1; }
}

/** 튜토리얼 닫힘 · 한국 시간 · 선택 테마 */
export async function newCtx(browser, w, h, { theme, clipboard = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  await ctx.addInitScript(([t]) => {
    try { localStorage.setItem("miryeo-ax-tutorial-v2", "1"); if (t) localStorage.setItem("miryeo-ax-theme", t); } catch { /* noop */ }
  }, [theme]);
  if (clipboard) await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  return ctx;
}

/** 페이지 오류·콘솔 오류 모으기 */
export function watch(page) {
  const errs = [];
  page.on("pageerror", (e) => errs.push(`pageerror ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`console ${m.text().slice(0, 160)}`); });
  return errs;
}

export async function go(page, path, wait = 700) {
  const r = await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
  return r;
}

export const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** axe-core (WCAG 2 A·AA) — AXE_PATH=…/axe-core/axe.min.js */
let axeSrc = null;
export async function axe(page, include) {
  if (!axeSrc) {
    const p = process.env.AXE_PATH;
    if (!p) throw new Error("AXE_PATH 환경변수에 axe-core/axe.min.js 경로가 필요합니다");
    axeSrc = readFileSync(p, "utf8");
  }
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSrc });
  return page.evaluate(async (inc) => {
    const r = await window.axe.run(inc ? { include: [inc] } : document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`);
  }, include ?? null);
}
