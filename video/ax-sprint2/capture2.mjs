// 데모 상태별 캡처 + 요소 위치 기록 (심사 페이지 인터랙티브 데모 · 고객 Finder 흐름)
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
import { writeFileSync } from "node:fs";
const OUT = process.argv[2]; const B = "http://localhost:3100"; const meta = {};
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
// 1) PC 심사 페이지 데모 영역 — 상황 3가지
if (!process.env.ONLY_FINDER) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + "/review/ax-sprint2", { waitUntil: "networkidle" });
  await p.evaluate(() => { document.querySelector("header.sticky")?.setAttribute("style", "position:static"); });
  for (const sc of ["base", "faster", "incoming"]) {
    await p.click(`[data-scenario=${sc}]`); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const sec = document.getElementById("demo"); const box = sec.querySelector(".lg\\:grid-cols-\\[minmax\\(0\\,20rem\\)_minmax\\(0\\,1fr\\)\\]") || sec;
      const top = sec.querySelector("header").getBoundingClientRect().top + scrollY;
      const R = (el) => { const q = el.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top + scrollY - top), Math.round(q.width), Math.round(q.height)]; };
      const res = document.querySelector("[data-testid=demo-result]");
      return { top: Math.round(top), height: Math.round(res.getBoundingClientRect().bottom + scrollY - top + 24),
        decision: R(document.querySelector("[data-testid=demo-decision]")), order: R(document.querySelector("[data-testid=demo-order]")),
        timeline: R(document.querySelector("[data-testid=demo-timeline]")), steps: R(document.querySelector("[aria-label^='분석 단계']")),
        scenarios: R(document.querySelector("[data-scenario=base]").closest("fieldset")), products: R(document.querySelector("[data-product]").closest("fieldset")),
        action: R(document.querySelector("[data-testid=demo-action]")), method: R(document.querySelector("[data-testid=demo-method]")) };
    });
    await p.screenshot({ path: `${OUT}/pc_demo_${sc}.png`, fullPage: true, clip: { x: 0, y: r.top - 30, width: 1440, height: r.height + 30 } });
    meta[`pc_demo_${sc}`] = { ...r, clipTop: r.top - 30 };
    console.log("pc_demo", sc, JSON.stringify(r));
  }
  // 고객 신호 영역
  const s = await p.evaluate(() => { const sec = document.getElementById("signal"); const q = sec.getBoundingClientRect(); return [Math.round(q.top + scrollY), Math.round(q.height)]; });
  await p.screenshot({ path: `${OUT}/pc_signal.png`, fullPage: true, clip: { x: 0, y: s[0], width: 1440, height: s[1] } });
  await ctx.close();
}
// 2) 모바일 심사 페이지 데모 결과 (기본 장면)
if (!process.env.ONLY_FINDER) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + "/review/ax-sprint2", { waitUntil: "networkidle" });
  await p.evaluate(() => { document.querySelector("header.sticky")?.setAttribute("style", "position:static"); });
  const top = await p.evaluate(() => Math.round(document.getElementById("demo").getBoundingClientRect().top + scrollY));
  await p.screenshot({ path: `${OUT}/mob_demo.png`, fullPage: true, clip: { x: 0, y: top, width: 412, height: 3200 } });
  await ctx.close();
}
// 3) 고객 Finder 흐름 (모바일)
{
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + "/beauty/finder", { waitUntil: "networkidle" }); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /진정 케어/ }).click(); await p.getByRole("button", { name: /결 & 모공/ }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/mob_finder1.png` });
  for (let k = 0; k < 4; k++) {
    await p.getByRole("button", { name: /다음/ }).click(); await p.waitForTimeout(350);
    await p.locator(".space-y-3 > button[aria-pressed]").nth(k === 0 ? 1 : 0).click(); await p.waitForTimeout(250);
    if (k === 1) { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/mob_finder2.png` }); }
  }
  await p.getByRole("button", { name: /결과 보기/ }).click();
  await p.waitForTimeout(1200);
  await p.evaluate(() => { for (const el of document.querySelectorAll("*")) { const ps = getComputedStyle(el).position; if (ps === "sticky" || ps === "fixed") el.style.position = "static"; } }); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/mob_finder_result.png`, fullPage: true });
  const save = p.getByRole("button", { name: /Beauty Passport에 저장/ });
  if (await save.count()) { await save.click(); await p.waitForTimeout(500); }
  await p.goto(B + "/beauty/passport", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  await p.evaluate(() => { for (const el of document.querySelectorAll("*")) { const ps = getComputedStyle(el).position; if (ps === "sticky" || ps === "fixed") el.style.position = "static"; } }); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/mob_passport.png`, fullPage: true });
  await p.goto(B + "/beauty/products/p-amp-50", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  await p.evaluate(() => { for (const el of document.querySelectorAll("*")) { const ps = getComputedStyle(el).position; if (ps === "sticky" || ps === "fixed") el.style.position = "static"; } }); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/mob_product.png`, fullPage: true });
  await ctx.close();
}
if (!process.env.ONLY_FINDER) writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta, null, 1));
await b.close();
